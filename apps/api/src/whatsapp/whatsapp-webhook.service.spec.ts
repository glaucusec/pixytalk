import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { WhatsAppPayloadMapper } from './whatsapp-payload.mapper.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';
import type { NormalizedInboundMessage } from './whatsapp.types.js';

describe('WhatsAppWebhookService', () => {
  const event: NormalizedInboundMessage = {
    wabaId: 'waba-1',
    phoneNumberId: 'phone-1',
    waId: 'customer-1',
    displayName: 'Ada',
    providerMessageId: 'wamid-1',
    providerTimestamp: new Date('2026-09-08T00:00:00.000Z'),
    type: 'TEXT',
    text: 'Hello',
    rawPayload: { id: 'wamid-1', type: 'text' },
  };

  const transaction = {
    whatsAppAccount: { findUnique: vi.fn() },
    contact: { upsert: vi.fn() },
    conversation: { upsert: vi.fn(), updateMany: vi.fn() },
    message: { createMany: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const mapper = { map: vi.fn() };

  let service: WhatsAppWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    mapper.map.mockReturnValue([event]);
    transaction.whatsAppAccount.findUnique.mockResolvedValue({
      id: 'account-1',
      organizationId: '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
      wabaId: 'waba-1',
    });
    transaction.contact.upsert.mockResolvedValue({ id: 'contact-1' });
    transaction.conversation.upsert.mockResolvedValue({
      id: 'conversation-1',
    });
    transaction.message.createMany.mockResolvedValue({ count: 1 });
    transaction.conversation.updateMany.mockResolvedValue({ count: 1 });

    service = new WhatsAppWebhookService(
      prisma as unknown as PrismaService,
      mapper as unknown as WhatsAppPayloadMapper,
    );
  });

  it('uses the phone-number account mapping as the tenant source', async () => {
    await expect(service.process({})).resolves.toEqual({
      processed: 1,
      duplicates: 0,
    });

    expect(transaction.whatsAppAccount.findUnique).toHaveBeenCalledWith({
      where: { phoneNumberId: 'phone-1' },
    });
    expect(transaction.contact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
          WhatsAppAccountId: 'account-1',
        }),
      }),
    );
    expect(transaction.message.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            organizationId: '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
            providerMessageId: 'wamid-1',
          }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it('acknowledges duplicate provider message IDs without updating the conversation', async () => {
    transaction.message.createMany.mockResolvedValue({ count: 0 });

    await expect(service.process({})).resolves.toEqual({
      processed: 0,
      duplicates: 1,
    });
    expect(transaction.conversation.updateMany).not.toHaveBeenCalled();
  });

  it('rejects messages for an unmapped business number', async () => {
    transaction.whatsAppAccount.findUnique.mockResolvedValue(null);

    await expect(service.process({})).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(transaction.contact.upsert).not.toHaveBeenCalled();
  });
});

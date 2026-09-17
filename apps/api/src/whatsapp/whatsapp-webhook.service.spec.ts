import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentService } from '../agents/agent.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConversationEventsService } from '../realtime/conversation-events.service.js';
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
    whatsAppAccount: { findUnique: vi.fn() },
    message: { findFirst: vi.fn(), update: vi.fn() },
  };
  const mapper = { map: vi.fn(), mapStatuses: vi.fn() };
  const agent = { respondToInboundMessage: vi.fn() };
  const conversationEvents = { conversationChanged: vi.fn() };

  let service: WhatsAppWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    mapper.map.mockReturnValue([event]);
    mapper.mapStatuses.mockReturnValue([]);
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
    agent.respondToInboundMessage.mockResolvedValue(null);

    service = new WhatsAppWebhookService(
      prisma as unknown as PrismaService,
      mapper as unknown as WhatsAppPayloadMapper,
      agent as unknown as AgentService,
      conversationEvents as unknown as ConversationEventsService,
    );
  });

  it('uses the phone-number account mapping as the tenant source', async () => {
    await expect(service.process({})).resolves.toEqual({
      processed: 1,
      duplicates: 0,
      statusesUpdated: 0,
      unmatchedStatuses: 0,
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
            senderType: 'CONTACT',
          }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(agent.respondToInboundMessage).toHaveBeenCalledWith({
      organizationId: '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
      conversationId: 'conversation-1',
    });
    expect(conversationEvents.conversationChanged).toHaveBeenCalledWith(
      '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
      'conversation-1',
      'message-created',
    );
  });

  it('acknowledges duplicate provider message IDs without updating the conversation', async () => {
    transaction.message.createMany.mockResolvedValue({ count: 0 });

    await expect(service.process({})).resolves.toEqual({
      processed: 0,
      duplicates: 1,
      statusesUpdated: 0,
      unmatchedStatuses: 0,
    });
    expect(transaction.conversation.updateMany).not.toHaveBeenCalled();
    expect(agent.respondToInboundMessage).not.toHaveBeenCalled();
  });

  it('acknowledges the webhook even when automatic reply generation fails', async () => {
    agent.respondToInboundMessage.mockRejectedValue(
      new Error('AI provider unavailable'),
    );

    await expect(service.process({})).resolves.toEqual({
      processed: 1,
      duplicates: 0,
      statusesUpdated: 0,
      unmatchedStatuses: 0,
    });
  });

  it('rejects messages for an unmapped business number', async () => {
    transaction.whatsAppAccount.findUnique.mockResolvedValue(null);

    await expect(service.process({})).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(transaction.contact.upsert).not.toHaveBeenCalled();
  });

  it('advances an outbound message delivery status for the mapped tenant', async () => {
    mapper.map.mockReturnValue([]);
    mapper.mapStatuses.mockReturnValue([
      {
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        providerMessageId: 'wamid-outbound',
        providerTimestamp: new Date('2026-09-08T00:01:00.000Z'),
        status: 'DELIVERED',
        rawPayload: { id: 'wamid-outbound', status: 'delivered' },
      },
    ]);
    prisma.whatsAppAccount.findUnique.mockResolvedValue({
      id: 'account-1',
      organizationId: '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
      wabaId: 'waba-1',
    });
    prisma.message.findFirst.mockResolvedValue({
      id: 'message-1',
      organizationId: '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
      conversationId: 'conversation-1',
      status: 'SENT',
      conversation: { WhatsAppAccountId: 'account-1' },
    });

    await expect(service.process({})).resolves.toEqual({
      processed: 0,
      duplicates: 0,
      statusesUpdated: 1,
      unmatchedStatuses: 0,
    });
    expect(prisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'message-1' },
        data: expect.objectContaining({ status: 'DELIVERED' }),
      }),
    );
    expect(conversationEvents.conversationChanged).toHaveBeenCalledWith(
      '9e5fc959-f084-45e9-9f8e-89e2b0b24688',
      'conversation-1',
      'message-updated',
    );
  });
});

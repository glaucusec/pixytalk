import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import {
  ConversationMode,
  MessageSenderType,
} from '../generated/prisma/client.js';
import type { MessagingProvider } from '../messaging/messaging-provider.js';
import { ConversationEventsService } from '../realtime/conversation-events.service.js';
import { ConversationsService } from './conversations.service.js';

describe('ConversationsService', () => {
  const transaction = {
    conversation: { findFirst: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    conversation: { findFirst: vi.fn(), update: vi.fn() },
    message: { create: vi.fn(), update: vi.fn() },
  };
  const messagingProvider = { sendText: vi.fn() };
  const conversationEvents = { conversationChanged: vi.fn() };
  const service = new ConversationsService(
    prisma as unknown as PrismaService,
    messagingProvider as unknown as MessagingProvider,
    conversationEvents as unknown as ConversationEventsService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.AI,
      contact: { waId: 'customer-1' },
      WhatsAppAccount: { phoneNumberId: 'phone-1' },
    });
  });

  it('requires human takeover before a manual reply', async () => {
    await expect(
      service.sendText(
        'organization-1',
        'conversation-1',
        'Hello',
        MessageSenderType.HUMAN,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(messagingProvider.sendText).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('prevents an AI reply while a human controls the conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.HUMAN,
      contact: { waId: 'customer-1' },
      WhatsAppAccount: { phoneNumberId: 'phone-1' },
    });

    await expect(
      service.sendText(
        'organization-1',
        'conversation-1',
        'Automated reply',
        MessageSenderType.AI,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(messagingProvider.sendText).not.toHaveBeenCalled();
  });

  it('persists a tenant-scoped takeover and publishes the change', async () => {
    transaction.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.AI,
    });
    transaction.conversation.update.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.HUMAN,
    });

    await expect(
      service.updateMode(
        'organization-1',
        'conversation-1',
        'user-1',
        ConversationMode.HUMAN,
      ),
    ).resolves.toMatchObject({ mode: ConversationMode.HUMAN });

    expect(transaction.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-1',
        organizationId: 'organization-1',
      },
    });
    expect(transaction.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: {
        mode: ConversationMode.HUMAN,
        modeChangedAt: expect.any(Date),
        modeChangedById: 'user-1',
      },
    });
    expect(conversationEvents.conversationChanged).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'mode-changed',
    );
  });

  it('sends a manual reply in human mode and publishes message changes', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.HUMAN,
      contact: { waId: 'customer-1' },
      WhatsAppAccount: { phoneNumberId: 'phone-1' },
    });
    prisma.message.create.mockResolvedValue({ id: 'pending-1' });
    prisma.conversation.update.mockResolvedValue({ id: 'conversation-1' });
    messagingProvider.sendText.mockResolvedValue({
      providerMessageId: 'wamid-1',
      rawResponse: { messages: [{ id: 'wamid-1' }] },
    });
    prisma.message.update.mockResolvedValue({
      id: 'pending-1',
      status: 'SENT',
    });

    await expect(
      service.sendText(
        'organization-1',
        'conversation-1',
        'Hello',
        MessageSenderType.HUMAN,
      ),
    ).resolves.toMatchObject({ status: 'SENT' });

    expect(conversationEvents.conversationChanged).toHaveBeenNthCalledWith(
      1,
      'organization-1',
      'conversation-1',
      'message-created',
    );
    expect(conversationEvents.conversationChanged).toHaveBeenNthCalledWith(
      2,
      'organization-1',
      'conversation-1',
      'message-updated',
    );
  });
});

import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIService } from '../ai/ai.service.js';
import { ConversationsService } from '../conversations/conversations.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  MessageDirection,
  MessageSenderType,
} from '../generated/prisma/client.js';
import { AgentService } from './agent.service.js';

describe('AgentService', () => {
  const prisma = {
    conversation: { findFirst: vi.fn() },
  };
  const ai = { generate: vi.fn() };
  const conversations = { sendText: vi.fn() };
  const previousAutoReplyValue = process.env.AI_AUTO_REPLY_ENABLED;

  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_AUTO_REPLY_ENABLED = 'true';
    service = new AgentService(
      prisma as unknown as PrismaService,
      ai as unknown as AIService,
      conversations as unknown as ConversationsService,
    );
  });

  afterEach(() => {
    if (previousAutoReplyValue === undefined) {
      delete process.env.AI_AUTO_REPLY_ENABLED;
    } else {
      process.env.AI_AUTO_REPLY_ENABLED = previousAutoReplyValue;
    }
  });

  it('does nothing when automatic replies are disabled', async () => {
    process.env.AI_AUTO_REPLY_ENABLED = 'false';

    await expect(
      service.respondToInboundMessage({
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
      }),
    ).resolves.toBeNull();

    expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    expect(ai.generate).not.toHaveBeenCalled();
    expect(conversations.sendText).not.toHaveBeenCalled();
  });

  it('generates from tenant-scoped history and sends an AI-attributed reply', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      contact: { displayName: 'Ada' },
      messages: [
        {
          direction: MessageDirection.INBOUND,
          senderType: MessageSenderType.CONTACT,
          text: 'Are you open?',
        },
        {
          direction: MessageDirection.OUTBOUND,
          senderType: MessageSenderType.HUMAN,
          text: 'Hello Ada',
        },
      ],
    });
    ai.generate.mockResolvedValue({
      message: 'A team member will confirm that for you.',
      intent: 'business_hours',
      requiresHuman: true,
    });
    conversations.sendText.mockResolvedValue({ id: 'message-1' });

    await expect(
      service.respondToInboundMessage({
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
      }),
    ).resolves.toEqual({
      response: {
        message: 'A team member will confirm that for you.',
        intent: 'business_hours',
        requiresHuman: true,
      },
      sentMessage: { id: 'message-1' },
    });

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'conversation-1',
          organizationId: 'organization-1',
        },
      }),
    );
    expect(ai.generate).toHaveBeenCalledWith({
      messages: [
        expect.objectContaining({ role: 'system' }),
        { role: 'assistant', content: 'Hello Ada' },
        { role: 'user', content: 'Are you open?' },
      ],
    });
    expect(ai.generate.mock.calls[0]?.[0].messages[0]?.content).toContain(
      "Reply in the customer's language and script.",
    );
    expect(conversations.sendText).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'A team member will confirm that for you.',
      MessageSenderType.AI,
    );
  });

  it('rejects a conversation outside the organization boundary', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(
      service.respondToInboundMessage({
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(ai.generate).not.toHaveBeenCalled();
    expect(conversations.sendText).not.toHaveBeenCalled();
  });
});

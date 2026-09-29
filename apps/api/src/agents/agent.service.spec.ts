import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIService } from '../ai/ai.service.js';
import { ConversationsService } from '../conversations/conversations.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  ConversationMode,
  MessageDirection,
  MessageSenderType,
} from '../generated/prisma/client.js';
import { AgentService } from './agent.service.js';
import { ToolRegistryService } from './tools/tool-registry.service.js';

describe('AgentService', () => {
  const prisma = {
    conversation: { findFirst: vi.fn() },
    agent: { upsert: vi.fn() },
  };
  const ai = { generate: vi.fn() };
  const conversations = { sendText: vi.fn(), handoffToHuman: vi.fn() };
  const toolRegistry = { listDefinitions: vi.fn(), execute: vi.fn() };
  const previousAutoReplyValue = process.env.AI_AUTO_REPLY_ENABLED;

  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_AUTO_REPLY_ENABLED = 'true';
    service = new AgentService(
      prisma as unknown as PrismaService,
      ai as unknown as AIService,
      conversations as unknown as ConversationsService,
      toolRegistry as unknown as ToolRegistryService,
    );
    prisma.agent.upsert.mockResolvedValue({
      id: 'agent-1',
      name: 'Support Agent',
      instructions: '',
      isEnabled: true,
      knowledgeEntries: [],
      tools: [],
    });
    toolRegistry.listDefinitions.mockReturnValue([]);
    conversations.handoffToHuman.mockResolvedValue({
      conversation: { id: 'conversation-1', mode: ConversationMode.HUMAN },
      changed: true,
    });
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
      mode: ConversationMode.AI,
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
      action: 'REPLY',
      message: 'A team member will confirm that for you.',
      intent: 'business_hours',
      handoffReason: null,
      toolCall: null,
    });
    conversations.sendText.mockResolvedValue({ id: 'message-1' });

    await expect(
      service.respondToInboundMessage({
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
      }),
    ).resolves.toEqual({
      response: {
        action: 'REPLY',
        message: 'A team member will confirm that for you.',
        intent: 'business_hours',
        handoffReason: null,
        toolCall: null,
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
      tools: [],
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

  it('executes an enabled trusted tool and uses its result for the reply', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.AI,
      messages: [
        {
          direction: MessageDirection.INBOUND,
          senderType: MessageSenderType.CONTACT,
          text: 'What is the price for 6 people?',
        },
      ],
    });
    prisma.agent.upsert.mockResolvedValue({
      id: 'agent-1',
      name: 'Trip Support',
      instructions: 'Help guests plan trips.',
      isEnabled: true,
      knowledgeEntries: [],
      tools: [
        {
          name: 'calculate_price',
          configuration: {
            currency: 'INR',
            basePriceMinor: 10_000,
            includedGuests: 2,
            pricePerAdditionalGuestMinor: 2_500,
          },
        },
      ],
    });
    toolRegistry.listDefinitions.mockReturnValue([
      {
        name: 'calculate_price',
        description: 'Calculate price',
        inputSchema: { type: 'object' },
      },
    ]);
    toolRegistry.execute.mockResolvedValue({
      toolName: 'calculate_price',
      data: { currency: 'INR', totalMinor: 20_000 },
    });
    ai.generate
      .mockResolvedValueOnce({
        action: 'TOOL',
        message: null,
        intent: 'pricing',
        handoffReason: null,
        toolCall: {
          name: 'calculate_price',
          argumentsJson: '{"guestCount":6}',
        },
      })
      .mockResolvedValueOnce({
        action: 'REPLY',
        message: 'The verified price for 6 guests is INR 200.00.',
        intent: 'pricing',
        handoffReason: null,
        toolCall: null,
      });
    conversations.sendText.mockResolvedValue({ id: 'message-1' });

    await service.respondToInboundMessage({
      organizationId: 'organization-1',
      conversationId: 'conversation-1',
    });

    expect(toolRegistry.execute).toHaveBeenCalledWith(
      {
        organizationId: 'organization-1',
        agentId: 'agent-1',
        conversationId: 'conversation-1',
      },
      { name: 'calculate_price', argumentsJson: '{"guestCount":6}' },
      [
        {
          name: 'calculate_price',
          configuration: expect.objectContaining({ currency: 'INR' }),
        },
      ],
    );
    expect(ai.generate.mock.calls[1]?.[0].messages.at(-1)?.content).toContain(
      '"totalMinor":20000',
    );
    expect(ai.generate.mock.calls[0]?.[0].tools).toEqual([
      expect.objectContaining({ name: 'calculate_price' }),
    ]);
    expect(ai.generate.mock.calls[1]?.[0].tools).toEqual([]);
    expect(conversations.sendText).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'The verified price for 6 guests is INR 200.00.',
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

  it('does not invoke AI while a human controls the conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.HUMAN,
      messages: [],
    });

    await expect(
      service.respondToInboundMessage({
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
      }),
    ).resolves.toBeNull();

    expect(ai.generate).not.toHaveBeenCalled();
    expect(conversations.sendText).not.toHaveBeenCalled();
  });

  it('discards a generated response when a human takes over before send', async () => {
    prisma.conversation.findFirst
      .mockResolvedValueOnce({
        id: 'conversation-1',
        mode: ConversationMode.AI,
        messages: [],
      })
      .mockResolvedValueOnce({ mode: ConversationMode.HUMAN });
    ai.generate.mockResolvedValue({
      action: 'REPLY',
      message: 'This response must not be sent.',
      intent: 'greeting',
      handoffReason: null,
      toolCall: null,
    });

    await expect(
      service.respondToInboundMessage({
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
      }),
    ).resolves.toBeNull();

    expect(conversations.sendText).not.toHaveBeenCalled();
  });

  it('moves an AI-requested handoff to human mode and sends one acknowledgement', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.AI,
      messages: [
        {
          direction: MessageDirection.INBOUND,
          senderType: MessageSenderType.CONTACT,
          text: 'Connect me to an agent',
        },
      ],
    });
    ai.generate.mockResolvedValue({
      action: 'HANDOFF',
      message: 'Sure, a team member will help you now.',
      intent: 'connect_to_agent',
      handoffReason: 'customer_requested_human',
      toolCall: null,
    });
    conversations.sendText.mockResolvedValue({ id: 'message-1' });

    await service.respondToInboundMessage({
      organizationId: 'organization-1',
      conversationId: 'conversation-1',
    });

    expect(conversations.handoffToHuman).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'customer_requested_human',
    );
    expect(conversations.sendText).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'Sure, a team member will help you now.',
      MessageSenderType.SYSTEM,
    );
    expect(toolRegistry.execute).not.toHaveBeenCalled();
  });

  it('hands off safely when an enabled tool fails', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      mode: ConversationMode.AI,
      messages: [],
    });
    prisma.agent.upsert.mockResolvedValue({
      id: 'agent-1',
      name: 'Support Agent',
      instructions: '',
      isEnabled: true,
      knowledgeEntries: [],
      tools: [{ name: 'calculate_price', configuration: { currency: 'INR' } }],
    });
    toolRegistry.listDefinitions.mockReturnValue([
      {
        name: 'calculate_price',
        description: 'Calculate price',
        inputSchema: { type: 'object' },
      },
    ]);
    ai.generate.mockResolvedValue({
      action: 'TOOL',
      message: null,
      intent: 'pricing',
      handoffReason: null,
      toolCall: {
        name: 'calculate_price',
        argumentsJson: '{"guestCount":6}',
      },
    });
    toolRegistry.execute.mockRejectedValue(
      new Error('Tool configuration is invalid'),
    );
    conversations.sendText.mockResolvedValue({ id: 'message-1' });

    await service.respondToInboundMessage({
      organizationId: 'organization-1',
      conversationId: 'conversation-1',
    });

    expect(conversations.handoffToHuman).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'tool_execution_failed',
    );
    expect(conversations.sendText).toHaveBeenCalledWith(
      'organization-1',
      'conversation-1',
      'I’m unable to verify that right now. A team member will help you.',
      MessageSenderType.SYSTEM,
    );
  });
});

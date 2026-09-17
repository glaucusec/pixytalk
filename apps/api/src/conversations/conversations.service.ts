import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ConversationMode,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  MessageType,
  Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  MESSAGING_PROVIDER,
  type MessagingProvider,
} from '../messaging/messaging-provider.js';
import { ConversationEventsService } from '../realtime/conversation-events.service.js';
import type { ListConversationsDto } from './dto/list-conversations.dto.js';
import type { ListMessagesDto } from './dto/list-messages.dto.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_PROVIDER)
    private readonly messagingProvider: MessagingProvider,
    private readonly conversationEvents: ConversationEventsService,
  ) {}

  async findAll(organizationId: string, query: ListConversationsDto) {
    const records = await this.prisma.conversation.findMany({
      where: { organizationId },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        contact: { select: { id: true, waId: true, displayName: true } },
        WhatsAppAccount: {
          select: { id: true, displayPhoneNumber: true },
        },
        messages: {
          orderBy: [{ providerTimestamp: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            direction: true,
            senderType: true,
            status: true,
            text: true,
            type: true,
            providerTimestamp: true,
          },
        },
      },
    });

    const hasMore = records.length > query.limit;
    const items = hasMore ? records.slice(0, query.limit) : records;

    return {
      items: items.map(({ messages, ...conversation }) => ({
        ...conversation,
        lastMessage: messages[0] ?? null,
      })),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async findOne(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: { select: { id: true, waId: true, displayName: true } },
        WhatsAppAccount: {
          select: { id: true, displayPhoneNumber: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async findMessages(
    organizationId: string,
    conversationId: string,
    query: ListMessagesDto,
  ) {
    await this.requireConversation(organizationId, conversationId);

    const records = await this.prisma.message.findMany({
      where: { organizationId, conversationId },
      orderBy: [{ providerTimestamp: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = records.length > query.limit;
    const page = hasMore ? records.slice(0, query.limit) : records;

    return {
      items: page.reverse(),
      nextCursor: hasMore ? (page[0]?.id ?? null) : null,
    };
  }

  async sendText(
    organizationId: string,
    conversationId: string,
    text: string,
    senderType: MessageSenderType = MessageSenderType.HUMAN,
  ) {
    const conversation = await this.requireConversation(
      organizationId,
      conversationId,
    );

    if (
      senderType === MessageSenderType.HUMAN &&
      conversation.mode !== ConversationMode.HUMAN
    ) {
      throw new ConflictException(
        'Take over the conversation before sending a manual reply',
      );
    }

    if (
      senderType === MessageSenderType.AI &&
      conversation.mode !== ConversationMode.AI
    ) {
      throw new ConflictException(
        'AI replies are disabled while a human controls the conversation',
      );
    }

    const sentAt = new Date();
    const pendingMessage = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId,
        providerMessageId: `local:${randomUUID()}`,
        direction: MessageDirection.OUTBOUND,
        senderType,
        type: MessageType.TEXT,
        status: MessageStatus.PENDING,
        text,
        providerTimestamp: sentAt,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: sentAt },
    });
    this.conversationEvents.conversationChanged(
      organizationId,
      conversationId,
      'message-created',
    );

    try {
      const result = await this.messagingProvider.sendText({
        phoneNumberId: conversation.WhatsAppAccount.phoneNumberId,
        recipientWaId: conversation.contact.waId,
        text,
      });

      const sentMessage = await this.prisma.message.update({
        where: { id: pendingMessage.id },
        data: {
          providerMessageId: result.providerMessageId,
          status: MessageStatus.SENT,
          rawPayload: toJsonValue(result.rawResponse),
        },
      });
      this.conversationEvents.conversationChanged(
        organizationId,
        conversationId,
        'message-updated',
      );
      return sentMessage;
    } catch (error) {
      await this.prisma.message.update({
        where: { id: pendingMessage.id },
        data: {
          status: MessageStatus.FAILED,
          content: {
            error:
              error instanceof Error
                ? error.message
                : 'WhatsApp could not send this message',
          },
        },
      });
      this.conversationEvents.conversationChanged(
        organizationId,
        conversationId,
        'message-updated',
      );

      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('WhatsApp could not send this message');
    }
  }

  private async requireConversation(
    organizationId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: {
        contact: { select: { waId: true } },
        WhatsAppAccount: { select: { phoneNumberId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async updateMode(
    organizationId: string,
    conversationId: string,
    userId: string,
    mode: ConversationMode,
  ) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const conversation = await transaction.conversation.findFirst({
        where: {
          id: conversationId,
          organizationId,
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.mode === mode) {
        return { conversation, changed: false };
      }

      const updatedConversation = await transaction.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          mode,
          modeChangedAt: new Date(),
          modeChangedById: userId,
        },
      });

      return { conversation: updatedConversation, changed: true };
    });

    if (result.changed) {
      this.conversationEvents.conversationChanged(
        organizationId,
        conversationId,
        'mode-changed',
      );
    }

    return result.conversation;
  }
}

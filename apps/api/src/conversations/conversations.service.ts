import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MessageDirection,
  MessageStatus,
  MessageType,
  Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  MESSAGING_PROVIDER,
  type MessagingProvider,
} from '../messaging/messaging-provider.js';
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
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
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
      nextCursor: hasMore ? page[0]?.id ?? null : null,
    };
  }

  async sendText(
    organizationId: string,
    conversationId: string,
    text: string,
  ) {
    const conversation = await this.requireConversation(
      organizationId,
      conversationId,
    );
    const sentAt = new Date();
    const pendingMessage = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId,
        providerMessageId: `local:${randomUUID()}`,
        direction: MessageDirection.OUTBOUND,
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

    try {
      const result = await this.messagingProvider.sendText({
        phoneNumberId: conversation.WhatsAppAccount.phoneNumberId,
        recipientWaId: conversation.contact.waId,
        text,
      });

      return await this.prisma.message.update({
        where: { id: pendingMessage.id },
        data: {
          providerMessageId: result.providerMessageId,
          status: MessageStatus.SENT,
          rawPayload: toJsonValue(result.rawResponse),
        },
      });
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
}

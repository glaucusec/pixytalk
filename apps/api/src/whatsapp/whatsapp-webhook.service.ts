import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MessageDirection,
  MessageStatus,
  Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { WhatsAppPayloadMapper } from './whatsapp-payload.mapper.js';
import type { NormalizedInboundMessage } from './whatsapp.types.js';
import type { NormalizedMessageStatus } from './whatsapp.types.js';

export interface WebhookProcessingResult {
  processed: number;
  duplicates: number;
  statusesUpdated: number;
  unmatchedStatuses: number;
}

const STATUS_RANK: Record<MessageStatus, number> = {
  PENDING: 0,
  RECEIVED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payloadMapper: WhatsAppPayloadMapper,
  ) {}

  async process(payload: unknown): Promise<WebhookProcessingResult> {
    const events = this.payloadMapper.map(payload);
    const statuses = this.payloadMapper.mapStatuses(payload);
    const result: WebhookProcessingResult = {
      processed: 0,
      duplicates: 0,
      statusesUpdated: 0,
      unmatchedStatuses: 0,
    };

    for (const event of events) {
      const inserted = await this.persistInboundMessage(event);

      if (inserted) {
        result.processed += 1;
      } else {
        result.duplicates += 1;
      }
    }

    for (const status of statuses) {
      if (await this.applyMessageStatus(status)) {
        result.statusesUpdated += 1;
      } else {
        result.unmatchedStatuses += 1;
      }
    }

    return result;
  }

  private async applyMessageStatus(
    event: NormalizedMessageStatus,
  ): Promise<boolean> {
    const account = await this.prisma.whatsAppAccount.findUnique({
      where: { phoneNumberId: event.phoneNumberId },
    });

    if (!account || account.wabaId !== event.wabaId) {
      this.logger.warn(
        `Ignoring a WhatsApp status for an unmapped phone number`,
      );
      return false;
    }

    const message = await this.prisma.message.findFirst({
      where: {
        providerMessageId: event.providerMessageId,
        organizationId: account.organizationId,
      },
      include: {
        conversation: { select: { WhatsAppAccountId: true } },
      },
    });

    if (!message || message.conversation.WhatsAppAccountId !== account.id) {
      this.logger.warn(
        `Ignoring a WhatsApp status for an unknown message`,
      );
      return false;
    }

    const incomingStatus = MessageStatus[event.status];
    if (STATUS_RANK[incomingStatus] <= STATUS_RANK[message.status]) {
      return true;
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: incomingStatus,
        rawPayload: toJsonValue(event.rawPayload),
      },
    });

    return true;
  }

  private async persistInboundMessage(
    event: NormalizedInboundMessage,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const account = await transaction.whatsAppAccount.findUnique({
        where: { phoneNumberId: event.phoneNumberId },
      });

      if (!account) {
        this.logger.error(
          `No WhatsApp account is mapped for WABA ${event.wabaId}`,
        );
        throw new ServiceUnavailableException(
          'WhatsApp account is not configured',
        );
      }

      if (account.wabaId !== event.wabaId) {
        this.logger.error(
          `WhatsApp account mapping does not match WABA ${event.wabaId}`,
        );
        throw new ServiceUnavailableException(
          'WhatsApp account mapping is invalid',
        );
      }

      const contact = await transaction.contact.upsert({
        where: {
          WhatsAppAccountId_waId: {
            WhatsAppAccountId: account.id,
            waId: event.waId,
          },
        },
        update: event.displayName ? { displayName: event.displayName } : {},
        create: {
          organizationId: account.organizationId,
          WhatsAppAccountId: account.id,
          waId: event.waId,
          displayName: event.displayName,
        },
      });

      const conversation = await transaction.conversation.upsert({
        where: {
          WhatsAppAccountId_contactId: {
            WhatsAppAccountId: account.id,
            contactId: contact.id,
          },
        },
        update: {},
        create: {
          organizationId: account.organizationId,
          WhatsAppAccountId: account.id,
          contactId: contact.id,
        },
      });

      const message = await transaction.message.createMany({
        data: [
          {
            organizationId: account.organizationId,
            conversationId: conversation.id,
            providerMessageId: event.providerMessageId,
            direction: MessageDirection.INBOUND,
            type: event.type,
            status: MessageStatus.RECEIVED,
            text: event.text,
            content:
              event.content === undefined
                ? Prisma.JsonNull
                : toJsonValue(event.content),
            rawPayload: toJsonValue(event.rawPayload),
            providerTimestamp: event.providerTimestamp,
          },
        ],
        skipDuplicates: true,
      });

      if (message.count === 0) {
        return false;
      }

      await transaction.conversation.updateMany({
        where: {
          id: conversation.id,
          OR: [
            { lastMessageAt: null },
            { lastMessageAt: { lt: event.providerTimestamp } },
          ],
        },
        data: { lastMessageAt: event.providerTimestamp },
      });

      this.logger.log(
        `Stored inbound WhatsApp message ${event.providerMessageId} for organization ${account.organizationId}`,
      );

      return true;
    });
  }
}

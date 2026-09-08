import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  NormalizedInboundMessage,
  NormalizedMessageStatus,
  SupportedInboundMessageType,
  SupportedMessageStatus,
} from './whatsapp.types.js';

const SUPPORTED_MESSAGE_TYPES = new Set<SupportedInboundMessageType>([
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DOCUMENT',
  'STICKER',
  'LOCATION',
  'CONTACTS',
  'INTERACTIVE',
]);

const SUPPORTED_MESSAGE_STATUSES = new Set<SupportedMessageStatus>([
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];

  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException(`WhatsApp webhook ${key} must be an array`);
  }

  return value;
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestException(
      `WhatsApp webhook is missing required field ${key}`,
    );
  }

  return value;
}

function mapMessageType(type: string): SupportedInboundMessageType {
  const normalized = type.toUpperCase() as SupportedInboundMessageType;

  return SUPPORTED_MESSAGE_TYPES.has(normalized) ? normalized : 'UNKNOWN';
}

@Injectable()
export class WhatsAppPayloadMapper {
  map(payload: unknown): NormalizedInboundMessage[] {
    if (!isRecord(payload) || payload.object !== 'whatsapp_business_account') {
      throw new BadRequestException('Invalid WhatsApp webhook payload');
    }

    const messages: NormalizedInboundMessage[] = [];

    for (const entryValue of readArray(payload, 'entry')) {
      if (!isRecord(entryValue)) {
        throw new BadRequestException('Invalid WhatsApp webhook entry');
      }

      const wabaId = readRequiredString(entryValue, 'id');

      for (const changeValue of readArray(entryValue, 'changes')) {
        if (!isRecord(changeValue)) {
          throw new BadRequestException('Invalid WhatsApp webhook change');
        }

        if (changeValue.field !== 'messages') {
          continue;
        }

        if (!isRecord(changeValue.value)) {
          throw new BadRequestException('Invalid WhatsApp webhook value');
        }

        this.mapChange(wabaId, changeValue.value, messages);
      }
    }

    return messages;
  }

  mapStatuses(payload: unknown): NormalizedMessageStatus[] {
    if (!isRecord(payload) || payload.object !== 'whatsapp_business_account') {
      throw new BadRequestException('Invalid WhatsApp webhook payload');
    }

    const statuses: NormalizedMessageStatus[] = [];

    for (const entryValue of readArray(payload, 'entry')) {
      if (!isRecord(entryValue)) {
        throw new BadRequestException('Invalid WhatsApp webhook entry');
      }

      const wabaId = readRequiredString(entryValue, 'id');

      for (const changeValue of readArray(entryValue, 'changes')) {
        if (!isRecord(changeValue) || changeValue.field !== 'messages') {
          continue;
        }
        if (!isRecord(changeValue.value)) {
          throw new BadRequestException('Invalid WhatsApp webhook value');
        }

        const rawStatuses = readArray(changeValue.value, 'statuses');
        if (rawStatuses.length === 0) continue;
        if (!isRecord(changeValue.value.metadata)) {
          throw new BadRequestException(
            'WhatsApp status payload is missing metadata',
          );
        }

        const phoneNumberId = readRequiredString(
          changeValue.value.metadata,
          'phone_number_id',
        );

        for (const rawStatus of rawStatuses) {
          if (!isRecord(rawStatus)) {
            throw new BadRequestException('Invalid WhatsApp message status');
          }

          const statusValue = readRequiredString(
            rawStatus,
            'status',
          ).toUpperCase() as SupportedMessageStatus;
          if (!SUPPORTED_MESSAGE_STATUSES.has(statusValue)) continue;

          const timestamp = readRequiredString(rawStatus, 'timestamp');
          const parsedTimestamp = Number(timestamp);
          const providerTimestamp = new Date(parsedTimestamp * 1000);
          if (
            !Number.isFinite(parsedTimestamp) ||
            Number.isNaN(providerTimestamp.getTime())
          ) {
            throw new BadRequestException(
              'WhatsApp status payload has an invalid timestamp',
            );
          }

          statuses.push({
            wabaId,
            phoneNumberId,
            providerMessageId: readRequiredString(rawStatus, 'id'),
            providerTimestamp,
            status: statusValue,
            rawPayload: rawStatus,
          });
        }
      }
    }

    return statuses;
  }

  private mapChange(
    wabaId: string,
    value: Record<string, unknown>,
    output: NormalizedInboundMessage[],
  ): void {
    const rawMessages = readArray(value, 'messages');

    if (rawMessages.length === 0) {
      return;
    }

    if (!isRecord(value.metadata)) {
      throw new BadRequestException(
        'WhatsApp message payload is missing metadata',
      );
    }

    const phoneNumberId = readRequiredString(value.metadata, 'phone_number_id');
    const contacts = readArray(value, 'contacts').filter(isRecord);

    for (const message of rawMessages) {
      if (!isRecord(message)) {
        throw new BadRequestException('Invalid WhatsApp message');
      }

      output.push(this.mapMessage(wabaId, phoneNumberId, contacts, message));
    }
  }

  private mapMessage(
    wabaId: string,
    phoneNumberId: string,
    contacts: Record<string, unknown>[],
    message: Record<string, unknown>,
  ): NormalizedInboundMessage {
    const id = readRequiredString(message, 'id');
    const from = readRequiredString(message, 'from');
    const timestamp = readRequiredString(message, 'timestamp');
    const type = readRequiredString(message, 'type');
    const parsedTimestamp = Number(timestamp);
    const providerTimestamp = new Date(parsedTimestamp * 1000);

    if (
      !Number.isFinite(parsedTimestamp) ||
      Number.isNaN(providerTimestamp.getTime())
    ) {
      throw new BadRequestException(
        'WhatsApp message payload has an invalid timestamp',
      );
    }

    const contact =
      contacts.find((candidate) => candidate.wa_id === from) ?? contacts[0];
    const profile = isRecord(contact?.profile) ? contact.profile : undefined;
    const contactWaId =
      typeof contact?.wa_id === 'string' ? contact.wa_id : from;
    const displayName =
      typeof profile?.name === 'string' ? profile.name : undefined;
    const textValue = isRecord(message.text) ? message.text : undefined;
    const normalizedType = mapMessageType(type);

    return {
      wabaId,
      phoneNumberId,
      waId: contactWaId,
      displayName,
      providerMessageId: id,
      providerTimestamp,
      type: normalizedType,
      text:
        normalizedType === 'TEXT' && typeof textValue?.body === 'string'
          ? textValue.body
          : undefined,
      content: message[type],
      rawPayload: message,
    };
  }
}

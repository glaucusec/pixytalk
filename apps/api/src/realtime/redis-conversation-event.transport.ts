import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getRedisConnectionOptions } from '../queue/queue-connection.js';
import type {
  ConversationChangeReason,
  ConversationEventTransport,
} from './conversation-event-transport.js';

const CHANNEL = 'pixytalk:conversation-events';
const REASONS = new Set<ConversationChangeReason>([
  'message-created',
  'message-updated',
  'mode-changed',
]);

@Injectable()
export class RedisConversationEventTransport
  implements ConversationEventTransport, OnModuleDestroy
{
  private readonly logger = new Logger(RedisConversationEventTransport.name);
  private readonly publisher = new Redis(getRedisConnectionOptions());
  private subscriber?: Redis;

  emitConversationChanged(
    organizationId: string,
    conversationId: string,
    reason: ConversationChangeReason,
  ) {
    void this.publisher
      .publish(
        CHANNEL,
        JSON.stringify({ organizationId, conversationId, reason }),
      )
      .catch((error: unknown) => {
        this.logger.error(
          `Could not publish conversation event: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  async subscribe(
    onEvent: (
      organizationId: string,
      conversationId: string,
      reason: ConversationChangeReason,
    ) => void,
  ) {
    if (this.subscriber) return;
    const subscriber = new Redis(getRedisConnectionOptions());
    this.subscriber = subscriber;
    subscriber.on('message', (channel, payload) => {
      if (channel !== CHANNEL) return;
      try {
        const event: unknown = JSON.parse(payload);
        if (
          typeof event !== 'object' ||
          event === null ||
          !('organizationId' in event) ||
          typeof event.organizationId !== 'string' ||
          !('conversationId' in event) ||
          typeof event.conversationId !== 'string' ||
          !('reason' in event) ||
          !REASONS.has(event.reason as ConversationChangeReason)
        )
          return;
        onEvent(
          event.organizationId,
          event.conversationId,
          event.reason as ConversationChangeReason,
        );
      } catch (error) {
        this.logger.warn(
          `Ignored invalid conversation event: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
    await subscriber.subscribe(CHANNEL);
  }

  onModuleDestroy() {
    this.subscriber?.disconnect();
    this.publisher.disconnect();
  }
}

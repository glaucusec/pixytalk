import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CONVERSATION_EVENT_TRANSPORT } from './conversation-event-transport.js';
import { ConversationEventsService } from './conversation-events.service.js';
import { ConversationsGateway } from './conversations.gateway.js';
import { RedisConversationEventTransport } from './redis-conversation-event.transport.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    ConversationsGateway,
    RedisConversationEventTransport,
    {
      provide: CONVERSATION_EVENT_TRANSPORT,
      useExisting: RedisConversationEventTransport,
    },
    ConversationEventsService,
  ],
  exports: [ConversationEventsService],
})
export class RealtimeModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CONVERSATION_EVENT_TRANSPORT } from './conversation-event-transport.js';
import { ConversationEventsService } from './conversation-events.service.js';
import { ConversationsGateway } from './conversations.gateway.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    ConversationsGateway,
    {
      provide: CONVERSATION_EVENT_TRANSPORT,
      useExisting: ConversationsGateway,
    },
    ConversationEventsService,
  ],
  exports: [ConversationEventsService],
})
export class RealtimeModule {}

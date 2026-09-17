import { Inject, Injectable } from '@nestjs/common';
import {
  CONVERSATION_EVENT_TRANSPORT,
  type ConversationChangeReason,
  type ConversationEventTransport,
} from './conversation-event-transport.js';

@Injectable()
export class ConversationEventsService {
  constructor(
    @Inject(CONVERSATION_EVENT_TRANSPORT)
    private readonly transport: ConversationEventTransport,
  ) {}

  conversationChanged(
    organizationId: string,
    conversationId: string,
    reason: ConversationChangeReason,
  ) {
    this.transport.emitConversationChanged(
      organizationId,
      conversationId,
      reason,
    );
  }
}

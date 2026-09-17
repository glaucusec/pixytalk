export type ConversationChangeReason =
  | 'message-created'
  | 'message-updated'
  | 'mode-changed';

export interface ConversationEventTransport {
  emitConversationChanged(
    organizationId: string,
    conversationId: string,
    reason: ConversationChangeReason,
  ): void;
}

export const CONVERSATION_EVENT_TRANSPORT = Symbol(
  'CONVERSATION_EVENT_TRANSPORT',
);

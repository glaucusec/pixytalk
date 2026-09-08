export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');

export interface SendTextMessageInput {
  phoneNumberId: string;
  recipientWaId: string;
  text: string;
}

export interface SendMessageResult {
  providerMessageId: string;
  rawResponse: unknown;
}

export interface MessagingProvider {
  sendText(input: SendTextMessageInput): Promise<SendMessageResult>;
}

export const INBOUND_PROCESSING_QUEUE = 'inbound-message-processing';
export const INBOUND_PROCESSING_JOB = 'process-inbound-message';

export interface InboundProcessingPayload {
  processingJobId: string;
  organizationId: string;
  conversationId: string;
  providerMessageId: string;
}

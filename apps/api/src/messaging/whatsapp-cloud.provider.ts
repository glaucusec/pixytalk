import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  MessagingProvider,
  SendMessageResult,
  SendTextMessageInput,
} from './messaging-provider.js';

interface MetaErrorResponse {
  error?: {
    code?: number;
    message?: string;
    type?: string;
  };
  messages?: Array<{ id?: string }>;
}

@Injectable()
export class WhatsAppCloudProvider implements MessagingProvider {
  private readonly logger = new Logger(WhatsAppCloudProvider.name);

  async sendText(input: SendTextMessageInput): Promise<SendMessageResult> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const graphVersion = process.env.META_GRAPH_API_VERSION ?? 'v26.0';

    if (!accessToken) {
      throw new BadGatewayException('WhatsApp access token is not configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${input.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.recipientWaId,
          type: 'text',
          text: { body: input.text, preview_url: false },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as MetaErrorResponse;
    const providerMessageId = payload.messages?.[0]?.id;

    if (!response.ok || !providerMessageId) {
      this.logger.error(
        `Meta rejected an outbound message (${payload.error?.code ?? response.status})`,
      );
      throw new BadGatewayException(
        payload.error?.message ?? 'WhatsApp could not send this message',
      );
    }

    return { providerMessageId, rawResponse: payload };
  }
}

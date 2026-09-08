import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { WhatsAppPayloadMapper } from './whatsapp-payload.mapper.js';
import { WhatsAppSignatureService } from './whatsapp-signature.service.js';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WhatsAppWebhookController],
  providers: [
    WhatsAppPayloadMapper,
    WhatsAppSignatureService,
    WhatsAppWebhookService,
  ],
})
export class WhatsappModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { WhatsAppPayloadMapper } from './whatsapp-payload.mapper.js';
import { WhatsAppSignatureService } from './whatsapp-signature.service.js';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';

@Module({
  imports: [DatabaseModule, RealtimeModule, QueueModule],
  controllers: [WhatsAppWebhookController],
  providers: [
    WhatsAppPayloadMapper,
    WhatsAppSignatureService,
    WhatsAppWebhookService,
  ],
})
export class WhatsappModule {}

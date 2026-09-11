import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { WhatsAppPayloadMapper } from './whatsapp-payload.mapper.js';
import { WhatsAppSignatureService } from './whatsapp-signature.service.js';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';

@Module({
  imports: [DatabaseModule, AgentsModule],
  controllers: [WhatsAppWebhookController],
  providers: [
    WhatsAppPayloadMapper,
    WhatsAppSignatureService,
    WhatsAppWebhookService,
  ],
})
export class WhatsappModule {}

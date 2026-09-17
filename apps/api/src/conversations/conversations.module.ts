import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MESSAGING_PROVIDER } from '../messaging/messaging-provider.js';
import { WhatsAppCloudProvider } from '../messaging/whatsapp-cloud.provider.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

@Module({
  imports: [DatabaseModule, RealtimeModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    WhatsAppCloudProvider,
    {
      provide: MESSAGING_PROVIDER,
      useExisting: WhatsAppCloudProvider,
    },
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}

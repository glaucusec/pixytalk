import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MESSAGING_PROVIDER } from '../messaging/messaging-provider.js';
import { WhatsAppCloudProvider } from '../messaging/whatsapp-cloud.provider.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    WhatsAppCloudProvider,
    {
      provide: MESSAGING_PROVIDER,
      useExisting: WhatsAppCloudProvider,
    },
  ],
})
export class ConversationsModule {}

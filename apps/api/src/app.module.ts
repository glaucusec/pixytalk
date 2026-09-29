import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { auth } from './auth/auth.js';
import { WhatsappModule } from './whatsapp/whatsapp.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { QueueModule } from './queue/queue.module.js';
import { getRedisConnectionOptions } from './queue/queue-connection.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: {
          limit: '1mb',
        },
        urlencoded: {
          limit: '1mb',
          extended: true,
        },
        rawBody: true,
      },
    }),
    BullModule.forRoot({ connection: getRedisConnectionOptions() }),
    ScheduleModule.forRoot(),
    OrganizationsModule,
    WhatsappModule,
    ConversationsModule,
    QueueModule,
    HealthModule,
  ],
})
export class AppModule {}

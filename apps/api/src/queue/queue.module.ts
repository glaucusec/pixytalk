import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { INBOUND_PROCESSING_QUEUE } from './queue.constants.js';
import { QueueOutboxPublisher } from './queue-outbox.publisher.js';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: INBOUND_PROCESSING_QUEUE }),
  ],
  providers: [QueueOutboxPublisher],
})
export class QueueModule {}

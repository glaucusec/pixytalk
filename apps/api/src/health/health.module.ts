import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { INBOUND_PROCESSING_QUEUE } from '../queue/queue.constants.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: INBOUND_PROCESSING_QUEUE }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}

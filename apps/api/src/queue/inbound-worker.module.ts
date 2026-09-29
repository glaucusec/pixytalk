import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { INBOUND_PROCESSING_QUEUE } from './queue.constants.js';
import { InboundJobProcessor } from './inbound-job.processor.js';

@Module({
  imports: [
    DatabaseModule,
    AgentsModule,
    BullModule.registerQueue({ name: INBOUND_PROCESSING_QUEUE }),
  ],
  providers: [InboundJobProcessor],
})
export class InboundWorkerModule {}

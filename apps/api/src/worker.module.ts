import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { InboundWorkerModule } from './queue/inbound-worker.module.js';
import { getRedisConnectionOptions } from './queue/queue-connection.js';

@Module({
  imports: [
    BullModule.forRoot({ connection: getRedisConnectionOptions() }),
    DatabaseModule,
    InboundWorkerModule,
  ],
})
export class WorkerModule {}

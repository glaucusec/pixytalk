import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { StructuredLogger } from './common/structured-logger.js';
import { WorkerModule } from './worker.module.js';

const app = await NestFactory.createApplicationContext(WorkerModule, {
  logger: new StructuredLogger(),
});
app.enableShutdownHooks();

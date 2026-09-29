import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { INBOUND_PROCESSING_QUEUE } from '../queue/queue.constants.js';

@Controller('health')
@AllowAnonymous()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(INBOUND_PROCESSING_QUEUE)
    private readonly queue: Queue,
  ) {}

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness() {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.queue.getJobCounts('waiting'),
    ]);
    const checks = {
      database: database.status === 'fulfilled' ? 'ok' : 'down',
      redis: redis.status === 'fulfilled' ? 'ok' : 'down',
    };
    if (database.status === 'rejected' || redis.status === 'rejected') {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
      });
    }

    return { status: 'ok', checks };
  }
}

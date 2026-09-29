import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Interval } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import {
  INBOUND_PROCESSING_JOB,
  INBOUND_PROCESSING_QUEUE,
  type InboundProcessingPayload,
} from './queue.constants.js';

@Injectable()
export class QueueOutboxPublisher {
  private readonly logger = new Logger(QueueOutboxPublisher.name);
  private publishing = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(INBOUND_PROCESSING_QUEUE)
    private readonly queue: Queue<InboundProcessingPayload>,
  ) {}

  @Interval(1000)
  async publishPending() {
    if (this.publishing) return;
    this.publishing = true;

    try {
      const staleBefore = new Date(Date.now() - 5 * 60_000);
      const pending = await this.prisma.inboundProcessingJob.findMany({
        where: {
          OR: [
            { status: 'PENDING' },
            { status: 'ENQUEUED', enqueuedAt: { lt: staleBefore } },
            { status: 'PROCESSING', updatedAt: { lt: staleBefore } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const event of pending) {
        try {
          if (event.status !== 'PENDING') {
            const existing = await this.queue.getJob(event.id);
            if (existing) continue;
          }
          await this.queue.add(
            INBOUND_PROCESSING_JOB,
            {
              processingJobId: event.id,
              organizationId: event.organizationId,
              conversationId: event.conversationId,
              providerMessageId: event.providerMessageId,
            },
            {
              jobId: event.id,
              attempts: 5,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10_000 },
              removeOnFail: { age: 30 * 24 * 60 * 60, count: 10_000 },
            },
          );
          await this.prisma.inboundProcessingJob.updateMany({
            where: {
              id: event.id,
              status: event.status,
              ...(event.status !== 'PENDING'
                ? { updatedAt: event.updatedAt }
                : {}),
            },
            data: { status: 'ENQUEUED', enqueuedAt: new Date() },
          });
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : 'unknown queue error';
          this.logger.error(
            `Could not enqueue inbound processing job ${event.id}: ` +
              reason.replace(/[\r\n\t]/g, ' ').slice(0, 300),
          );
          break;
        }
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'unknown database error';
      this.logger.error(
        `Could not read inbound processing outbox: ` +
          reason.replace(/[\r\n\t]/g, ' ').slice(0, 300),
      );
    } finally {
      this.publishing = false;
    }
  }
}

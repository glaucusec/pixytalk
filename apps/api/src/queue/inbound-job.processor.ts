import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import {
  INBOUND_PROCESSING_QUEUE,
  type InboundProcessingPayload,
} from './queue.constants.js';
import { AgentService } from '../agents/agent.service.js';

@Processor(INBOUND_PROCESSING_QUEUE, { concurrency: 5 })
export class InboundJobProcessor extends WorkerHost {
  private readonly logger = new Logger(InboundJobProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
  ) {
    super();
  }

  async process(job: Job<InboundProcessingPayload>): Promise<void> {
    const { processingJobId, organizationId, conversationId } = job.data;
    const event = await this.prisma.inboundProcessingJob.findUnique({
      where: { id: processingJobId },
      select: { status: true },
    });

    if (!event || event.status === 'COMPLETED' || event.status === 'FAILED') {
      return;
    }

    await this.prisma.inboundProcessingJob.update({
      where: { id: processingJobId },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    await this.agentService.respondToInboundMessage({
      organizationId,
      conversationId,
      providerMessageId: job.data.providerMessageId,
    });

    await this.prisma.inboundProcessingJob.update({
      where: { id: processingJobId },
      data: { status: 'COMPLETED', completedAt: new Date(), lastError: null },
    });
    this.logger.log(
      `Completed inbound processing job ${processingJobId} ` +
        `(organization=${organizationId} conversation=${conversationId})`,
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<InboundProcessingPayload> | undefined, error: Error) {
    if (!job) return;
    const maxAttempts = Number(job.opts.attempts ?? 1);
    const terminal = job.attemptsMade >= maxAttempts;
    const safeError = error.message.replace(/[\r\n\t]/g, ' ').slice(0, 500);

    await this.prisma.inboundProcessingJob.updateMany({
      where: { id: job.data.processingJobId, status: { not: 'COMPLETED' } },
      data: {
        ...(terminal ? { status: 'FAILED' as const } : {}),
        lastError: safeError,
      },
    });
    this.logger.error(
      `Inbound processing job ${job.data.processingJobId} failed ` +
        `(attempt=${job.attemptsMade}/${maxAttempts}, terminal=${terminal}): ${safeError}`,
    );
  }
}

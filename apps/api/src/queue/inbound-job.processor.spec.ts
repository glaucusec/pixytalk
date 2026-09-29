import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import { AgentService } from '../agents/agent.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { InboundJobProcessor } from './inbound-job.processor.js';
import type { InboundProcessingPayload } from './queue.constants.js';

describe('InboundJobProcessor', () => {
  const prisma = {
    inboundProcessingJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const agentService = { respondToInboundMessage: vi.fn() };
  const processor = new InboundJobProcessor(
    prisma as unknown as PrismaService,
    agentService as unknown as AgentService,
  );
  const job = {
    data: {
      processingJobId: 'job-1',
      providerMessageId: 'wamid-1',
      organizationId: 'organization-1',
      conversationId: 'conversation-1',
    },
    opts: { attempts: 5 },
    attemptsMade: 0,
  } as Job<InboundProcessingPayload>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.inboundProcessingJob.findUnique.mockResolvedValue({
      status: 'ENQUEUED',
    });
    agentService.respondToInboundMessage.mockResolvedValue(null);
  });

  it('processes queued inbound work and marks the outbox record completed', async () => {
    await processor.process(job);

    expect(agentService.respondToInboundMessage).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      conversationId: 'conversation-1',
    });
    expect(prisma.inboundProcessingJob.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'PROCESSING' }),
      }),
    );
    expect(prisma.inboundProcessingJob.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('skips work already completed by an earlier delivery', async () => {
    prisma.inboundProcessingJob.findUnique.mockResolvedValue({
      status: 'COMPLETED',
    });

    await processor.process(job);

    expect(agentService.respondToInboundMessage).not.toHaveBeenCalled();
    expect(prisma.inboundProcessingJob.update).not.toHaveBeenCalled();
  });

  it('records only terminal retry failures as failed outbox jobs', async () => {
    const failedJob = {
      ...job,
      attemptsMade: 5,
    } as Job<InboundProcessingPayload>;
    await processor.onFailed(failedJob, new Error('temporary\nprovider error'));

    expect(prisma.inboundProcessingJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: { not: 'COMPLETED' } },
      data: { status: 'FAILED', lastError: 'temporary provider error' },
    });
  });
});

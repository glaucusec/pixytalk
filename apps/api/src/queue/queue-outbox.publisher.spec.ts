import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { INBOUND_PROCESSING_JOB } from './queue.constants.js';
import { QueueOutboxPublisher } from './queue-outbox.publisher.js';

describe('QueueOutboxPublisher', () => {
  const prisma = {
    inboundProcessingJob: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const queue = { add: vi.fn() };
  const publisher = new QueueOutboxPublisher(
    prisma as unknown as PrismaService,
    queue as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.inboundProcessingJob.findMany.mockResolvedValue([
      {
        id: 'job-1',
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
        providerMessageId: 'wamid-1',
      },
    ]);
    queue.add.mockResolvedValue({ id: 'job-1' });
    prisma.inboundProcessingJob.updateMany.mockResolvedValue({ count: 1 });
  });

  it('publishes durable outbox records with retry and stable job options', async () => {
    await publisher.publishPending();

    expect(queue.add).toHaveBeenCalledWith(
      INBOUND_PROCESSING_JOB,
      {
        processingJobId: 'job-1',
        organizationId: 'organization-1',
        conversationId: 'conversation-1',
        providerMessageId: 'wamid-1',
      },
      expect.objectContaining({
        jobId: 'job-1',
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      }),
    );
    expect(prisma.inboundProcessingJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'ENQUEUED' }),
      }),
    );
  });

  it('leaves an outbox record pending when Redis publication fails', async () => {
    queue.add.mockRejectedValue(new Error('Redis unavailable'));

    await publisher.publishPending();

    expect(prisma.inboundProcessingJob.updateMany).not.toHaveBeenCalled();
  });
});

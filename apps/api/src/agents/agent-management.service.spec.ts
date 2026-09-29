import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { AgentManagementService } from './agent-management.service.js';
import { ToolRegistryService } from './tools/tool-registry.service.js';

describe('AgentManagementService', () => {
  const prisma = {
    agent: { upsert: vi.fn(), findUnique: vi.fn() },
    knowledgeEntry: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    agentToolConfig: { findMany: vi.fn(), upsert: vi.fn() },
  };
  const toolRegistry = { validateConfiguration: vi.fn() };
  const service = new AgentManagementService(
    prisma as unknown as PrismaService,
    toolRegistry as unknown as ToolRegistryService,
  );

  it('creates knowledge with the active organization on every tenant-owned row', async () => {
    prisma.agent.upsert.mockResolvedValue({ id: 'agent-1' });
    prisma.knowledgeEntry.create.mockResolvedValue({ id: 'knowledge-1' });

    await service.createKnowledge('organization-1', {
      category: 'policy',
      title: 'Cancellation',
      content: 'Cancellations require 24 hours notice.',
    });

    expect(prisma.knowledgeEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'organization-1',
        agentId: 'agent-1',
      }),
    });
  });

  it('tenant-scopes knowledge reads by both organization and agent', async () => {
    prisma.agent.upsert.mockResolvedValue({ id: 'agent-1' });
    prisma.knowledgeEntry.findMany.mockResolvedValue([]);

    await service.listKnowledge('organization-1');

    expect(prisma.knowledgeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'organization-1', agentId: 'agent-1' },
      }),
    );
  });

  it('deletes knowledge only inside the active organization and agent', async () => {
    prisma.agent.upsert.mockResolvedValue({ id: 'agent-1' });
    prisma.knowledgeEntry.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      service.deleteKnowledge('organization-1', 'knowledge-1'),
    ).resolves.toEqual({ deleted: true });
    expect(prisma.knowledgeEntry.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'knowledge-1',
        organizationId: 'organization-1',
        agentId: 'agent-1',
      },
    });
  });

  it('does not disclose or delete knowledge owned by another tenant', async () => {
    prisma.agent.upsert.mockResolvedValue({ id: 'agent-2' });
    prisma.knowledgeEntry.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.deleteKnowledge('organization-2', 'knowledge-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ConfigureAgentToolDto } from './dto/configure-agent-tool.dto.js';
import type { CreateKnowledgeEntryDto } from './dto/create-knowledge-entry.dto.js';
import type { UpdateAgentDto } from './dto/update-agent.dto.js';
import { ToolRegistryService } from './tools/tool-registry.service.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class AgentManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toolRegistry: ToolRegistryService,
  ) {}

  async getCurrent(organizationId: string) {
    await this.requireAgent(organizationId);
    return this.prisma.agent.findUnique({
      where: { organizationId },
      include: {
        knowledgeEntries: {
          where: { organizationId },
          orderBy: [{ category: 'asc' }, { title: 'asc' }],
        },
        tools: { where: { organizationId }, orderBy: { name: 'asc' } },
      },
    });
  }

  updateCurrent(organizationId: string, input: UpdateAgentDto) {
    return this.prisma.agent.upsert({
      where: { organizationId },
      create: {
        organizationId,
        name: input.name,
        instructions: input.instructions ?? '',
        isEnabled: input.isEnabled ?? true,
      },
      update: {
        name: input.name,
        ...(input.instructions === undefined
          ? {}
          : { instructions: input.instructions }),
        ...(input.isEnabled === undefined
          ? {}
          : { isEnabled: input.isEnabled }),
      },
    });
  }

  async listKnowledge(organizationId: string) {
    const agent = await this.requireAgent(organizationId);
    return this.prisma.knowledgeEntry.findMany({
      where: { organizationId, agentId: agent.id },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
  }

  async createKnowledge(
    organizationId: string,
    input: CreateKnowledgeEntryDto,
  ) {
    const agent = await this.requireAgent(organizationId);
    return this.prisma.knowledgeEntry.create({
      data: {
        organizationId,
        agentId: agent.id,
        category: input.category,
        title: input.title,
        content: input.content,
      },
    });
  }

  async listTools(organizationId: string) {
    const agent = await this.requireAgent(organizationId);
    return this.prisma.agentToolConfig.findMany({
      where: { organizationId, agentId: agent.id },
      orderBy: { name: 'asc' },
    });
  }

  async configureTool(
    organizationId: string,
    name: string,
    input: ConfigureAgentToolDto,
  ) {
    const agent = await this.requireAgent(organizationId);
    const configuration = this.toolRegistry.validateConfiguration(
      name,
      input.configuration,
    );

    return this.prisma.agentToolConfig.upsert({
      where: { agentId_name: { agentId: agent.id, name } },
      create: {
        organizationId,
        agentId: agent.id,
        name,
        isEnabled: input.isEnabled ?? true,
        configuration: toJsonValue(configuration),
      },
      update: {
        configuration: toJsonValue(configuration),
        ...(input.isEnabled === undefined
          ? {}
          : { isEnabled: input.isEnabled }),
      },
    });
  }

  private async requireAgent(organizationId: string) {
    return this.prisma.agent.upsert({
      where: { organizationId },
      create: { organizationId, name: 'Customer Support Agent' },
      update: {},
      select: { id: true },
    });
  }
}

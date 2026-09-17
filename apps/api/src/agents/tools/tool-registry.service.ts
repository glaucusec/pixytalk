import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import type { AIToolCall } from '../../ai/ai.types.js';
import {
  AGENT_TOOLS,
  type AgentTool,
  type ToolExecutionContext,
} from './agent-tool.js';

export interface EnabledToolConfiguration {
  name: string;
  configuration: Record<string, unknown>;
}

@Injectable()
export class ToolRegistryService {
  private readonly toolsByName: Map<string, AgentTool>;

  constructor(@Inject(AGENT_TOOLS) tools: AgentTool[]) {
    this.toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  }

  listDefinitions(enabledTools: EnabledToolConfiguration[]) {
    return enabledTools.flatMap(({ name }) => {
      const tool = this.toolsByName.get(name);
      if (!tool) return [];

      return [
        {
          name: tool.name,
          description: tool.description,
          inputSchema: z.toJSONSchema(tool.inputSchema, { target: 'draft-7' }),
        },
      ];
    });
  }

  validateConfiguration(name: string, configuration: unknown) {
    const tool = this.requireTool(name);
    return tool.configurationSchema.parse(configuration);
  }

  async execute(
    context: ToolExecutionContext,
    toolCall: AIToolCall,
    enabledTools: EnabledToolConfiguration[],
  ) {
    const enabledTool = enabledTools.find(
      (configuration) => configuration.name === toolCall.name,
    );

    if (!enabledTool) {
      throw new BadRequestException('Requested tool is not enabled');
    }

    const tool = this.requireTool(toolCall.name);
    const input = tool.inputSchema.parse(
      this.parseArguments(toolCall.argumentsJson),
    );
    const configuration = tool.configurationSchema.parse(
      enabledTool.configuration,
    );

    return tool.execute(context, input, configuration);
  }

  has(name: string) {
    return this.toolsByName.has(name);
  }

  private requireTool(name: string) {
    const tool = this.toolsByName.get(name);
    if (!tool) throw new NotFoundException('Agent tool not found');
    return tool;
  }

  private parseArguments(argumentsJson: string) {
    try {
      const value: unknown = JSON.parse(argumentsJson);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Tool arguments must be a JSON object');
      }
      return value;
    } catch {
      throw new BadRequestException('Tool arguments are invalid JSON');
    }
  }
}

import type { z } from 'zod';

export interface ToolExecutionContext {
  organizationId: string;
  agentId: string;
  conversationId: string;
}

export interface ToolExecutionResult {
  toolName: string;
  data: Record<string, unknown>;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<Record<string, unknown>>;
  readonly configurationSchema: z.ZodType<Record<string, unknown>>;

  execute(
    context: ToolExecutionContext,
    input: Record<string, unknown>,
    configuration: Record<string, unknown>,
  ): Promise<ToolExecutionResult>;
}

export const AGENT_TOOLS = Symbol('AGENT_TOOLS');

import { z } from 'zod';

export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AIRequest {
  messages: AIMessage[];
  tools: AIToolDefinition[];
}

export const AgentActionSchema = z.enum(['REPLY', 'TOOL', 'HANDOFF']);

export const AIToolCallSchema = z.object({
  name: z.string().trim().min(1).max(100),
  argumentsJson: z.string().trim().min(2).max(10_000),
});

export type AIToolCall = z.infer<typeof AIToolCallSchema>;

export interface AgentResponse {
  action: z.infer<typeof AgentActionSchema>;
  message: string | null;
  intent: string | null;
  handoffReason: string | null;
  toolCall: AIToolCall | null;
}

export function createAgentResponseSchema(tools: AIToolDefinition[]) {
  const names = tools.map((tool) => tool.name);
  const toolCallSchema =
    names.length > 0
      ? AIToolCallSchema.extend({
          name: z.enum(names as [string, ...string[]]),
        }).nullable()
      : z.null();

  return z
    .object({
      action: AgentActionSchema,
      message: z.string().trim().min(1).max(4096).nullable(),
      intent: z.string().trim().min(1).max(100).nullable(),
      handoffReason: z.string().trim().min(1).max(500).nullable(),
      toolCall: toolCallSchema,
    })
    .superRefine((response, context) => {
      if (response.action === 'REPLY') {
        if (!response.message || response.toolCall || response.handoffReason) {
          context.addIssue({
            code: 'custom',
            message:
              'A reply requires a message and cannot include a tool call or handoff reason',
          });
        }
        return;
      }

      if (response.action === 'TOOL') {
        if (!response.toolCall || response.message || response.handoffReason) {
          context.addIssue({
            code: 'custom',
            message:
              'A tool decision requires a tool call and cannot include a message or handoff reason',
          });
        }
        return;
      }

      if (!response.message || !response.handoffReason || response.toolCall) {
        context.addIssue({
          code: 'custom',
          message:
            'A handoff requires a customer message and reason and cannot include a tool call',
        });
      }
    });
}

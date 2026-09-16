import { z } from 'zod';

export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
}

export const AIToolCallSchema = z.object({
  name: z.string().trim().min(1).max(100),
  argumentsJson: z.string().trim().min(2).max(10_000),
});

export const AgentResponseSchema = z
  .object({
    message: z.string().trim().min(1).max(4096).nullable(),
    intent: z.string().nullable(),
    requiresHuman: z.boolean(),
    toolCall: AIToolCallSchema.nullable(),
  })
  .refine(
    (response) => response.message !== null || response.toolCall !== null,
    {
      message: 'A response must contain a message or a tool call',
    },
  );

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AIToolCall = z.infer<typeof AIToolCallSchema>;

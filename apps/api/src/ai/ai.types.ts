import { z } from 'zod';

export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
}

export const AgentResponseSchema = z.object({
  message: z.string().trim().min(1).max(4096),
  intent: z.string().nullable(),
  requiresHuman: z.boolean(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

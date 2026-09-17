import type { AgentResponse, AIRequest } from './ai.types.js';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProvider {
  generate(input: AIRequest): Promise<AgentResponse>;
}

import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER, type AIProvider } from './ai.provider.js';
import type { AgentResponse, AIRequest } from './ai.types.js';

@Injectable()
export class AIService {
  constructor(
    @Inject(AI_PROVIDER)
    private readonly provider: AIProvider,
  ) {}

  generate(input: AIRequest): Promise<AgentResponse> {
    return this.provider.generate(input);
  }
}

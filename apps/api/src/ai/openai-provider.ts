import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { AIProvider } from './ai.provider.js';
import {
  AgentResponseSchema,
  type AgentResponse,
  type AIRequest,
} from './ai.types.js';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = process.env.OPENAI_MODEL ?? 'gpt-5-mini';
  }

  async generate(input: AIRequest): Promise<AgentResponse> {
    if (!this.client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      input: input.messages,
      text: {
        format: zodTextFormat(AgentResponseSchema, 'pixytalk_agent_schema'),
      },
    });

    if (!response.output_parsed) {
      throw new Error('OpenAI returned no structured response');
    }

    return response.output_parsed;
  }
}

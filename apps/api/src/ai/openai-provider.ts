import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { getAIRequestTimeoutMs } from './ai.config.js';
import {
  AIProviderConfigurationError,
  AIProviderResponseError,
} from './ai.errors.js';
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

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          timeout: getAIRequestTimeoutMs(),
          maxRetries: 0,
        })
      : null;
    this.model = process.env.OPENAI_MODEL ?? 'gpt-5-mini';
  }

  async generate(input: AIRequest): Promise<AgentResponse> {
    if (!this.client) {
      throw new AIProviderConfigurationError('OpenAI');
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
      throw new AIProviderResponseError('OpenAI');
    }

    const parsedResponse = AgentResponseSchema.safeParse(
      response.output_parsed,
    );

    if (!parsedResponse.success) {
      throw new AIProviderResponseError('OpenAI');
    }

    return parsedResponse.data;
  }
}

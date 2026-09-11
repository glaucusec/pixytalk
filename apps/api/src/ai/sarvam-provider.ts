import { Injectable } from '@nestjs/common';
import { SarvamAI, SarvamAIClient } from 'sarvamai';
import { z } from 'zod';
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

const DEFAULT_SARVAM_BASE_URL = 'https://api.sarvam.ai/v1';
const DEFAULT_SARVAM_MODEL = 'sarvam-105b-conversations';

@Injectable()
export class SarvamProvider implements AIProvider {
  private readonly client: SarvamAIClient | null;
  private readonly model: SarvamAI.SarvamModelIds;

  constructor() {
    const apiKey = process.env.SARVAM_API_KEY?.trim();

    this.client = apiKey
      ? new SarvamAIClient({
          apiSubscriptionKey: apiKey,
          baseUrl: process.env.SARVAM_BASE_URL ?? DEFAULT_SARVAM_BASE_URL,
          timeoutInSeconds: getAIRequestTimeoutMs() / 1_000,
          maxRetries: 0,
        })
      : null;
    this.model = this.resolveModel(process.env.SARVAM_MODEL);
  }

  async generate(input: AIRequest): Promise<AgentResponse> {
    if (!this.client) {
      throw new AIProviderConfigurationError('Sarvam');
    }

    const completion = await this.client.chat.completions({
      model: this.model,
      messages: input.messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'pixytalk_agent_schema',
          description: 'A customer-support reply and routing decision',
          schema: z.toJSONSchema(AgentResponseSchema, { target: 'draft-7' }),
          strict: true,
        },
      },
    });
    const content = completion.choices[0]?.message.content;

    if (!content) {
      throw new AIProviderResponseError('Sarvam');
    }

    try {
      return AgentResponseSchema.parse(JSON.parse(content));
    } catch {
      throw new AIProviderResponseError('Sarvam');
    }
  }

  private resolveModel(configuredModel: string | undefined) {
    if (
      configuredModel === 'sarvam-105b' ||
      configuredModel === 'sarvam-105b-conversations'
    ) {
      return configuredModel;
    }

    return DEFAULT_SARVAM_MODEL;
  }
}

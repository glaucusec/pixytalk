import { Injectable, Logger } from '@nestjs/common';
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

const DEFAULT_SARVAM_BASE_URL = 'https://api.sarvam.ai';
const DEFAULT_SARVAM_MODEL = 'sarvam-105b-conversations';
const DEFAULT_SARVAM_MAX_TOKENS = 1_024;

@Injectable()
export class SarvamProvider implements AIProvider {
  private readonly logger = new Logger(SarvamProvider.name);
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

    const completion = await this.requestCompletion(input.messages);
    const response = this.parseResponse(completion.choices[0]?.message.content);

    if (response) {
      return response;
    }

    this.logger.warn(
      `Sarvam returned invalid structured output (finishReason=${completion.choices[0]?.finish_reason ?? 'unknown'}); retrying once`,
    );

    const retry = await this.requestCompletion([
      ...input.messages,
      {
        role: 'system',
        content:
          'Regenerate the response and satisfy every required response-format field. Do not omit any field.',
      },
    ]);
    const retriedResponse = this.parseResponse(
      retry.choices[0]?.message.content,
    );

    if (!retriedResponse) {
      throw new AIProviderResponseError('Sarvam');
    }

    return retriedResponse;
  }

  private requestCompletion(messages: AIRequest['messages']) {
    if (!this.client) {
      throw new AIProviderConfigurationError('Sarvam');
    }

    return this.client.chat.completions({
      model: this.model,
      messages,
      max_tokens: DEFAULT_SARVAM_MAX_TOKENS,
      reasoning_effort: 'low',
      temperature: 0.2,
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
  }

  private parseResponse(content: string | undefined): AgentResponse | null {
    if (!content) return null;

    const normalized = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    try {
      return AgentResponseSchema.parse(JSON.parse(normalized));
    } catch {
      return null;
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

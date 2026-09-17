import { Injectable, Logger } from '@nestjs/common';
import { AIProvidersUnavailableError } from './ai.errors.js';
import type { AIProvider } from './ai.provider.js';
import type { AgentResponse, AIRequest } from './ai.types.js';
import { OpenAIProvider } from './openai-provider.js';
import { SarvamProvider } from './sarvam-provider.js';

interface ProviderErrorMetadata {
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
  requestID?: unknown;
  requestId?: unknown;
}

function summarizeProviderError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'UnknownError';
  }

  const metadata = error as ProviderErrorMetadata;
  const details = [
    typeof metadata.name === 'string' ? metadata.name : 'Error',
    typeof metadata.status === 'number'
      ? `status=${metadata.status}`
      : typeof metadata.statusCode === 'number'
        ? `status=${metadata.statusCode}`
        : null,
    typeof metadata.requestID === 'string'
      ? `requestId=${metadata.requestID}`
      : typeof metadata.requestId === 'string'
        ? `requestId=${metadata.requestId}`
        : null,
  ].filter(Boolean);

  return details.join(' ');
}

@Injectable()
export class FallbackAIProvider implements AIProvider {
  private readonly logger = new Logger(FallbackAIProvider.name);

  constructor(
    private readonly sarvamProvider: SarvamProvider,
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  async generate(input: AIRequest): Promise<AgentResponse> {
    try {
      const response = await this.sarvamProvider.generate(input);
      this.logger.log('Sarvam primary generated an AI response');
      return response;
    } catch (error) {
      this.logger.warn(
        `Sarvam primary failed (${summarizeProviderError(error)}); trying OpenAI fallback`,
      );
    }

    try {
      const response = await this.openAIProvider.generate(input);
      this.logger.log('OpenAI fallback generated an AI response');
      return response;
    } catch (error) {
      this.logger.error(
        `OpenAI fallback failed (${summarizeProviderError(error)})`,
      );
      throw new AIProvidersUnavailableError();
    }
  }
}

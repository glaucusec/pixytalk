import { Module } from '@nestjs/common';
import { AIService } from './ai.service.js';
import { FallbackAIProvider } from './fallback-ai-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { AI_PROVIDER } from './ai.provider.js';
import { SarvamProvider } from './sarvam-provider.js';

@Module({
  providers: [
    AIService,
    SarvamProvider,
    OpenAIProvider,
    FallbackAIProvider,
    { provide: AI_PROVIDER, useExisting: FallbackAIProvider },
  ],
  exports: [AIService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { AIService } from './ai.service.js';
import { OpenAIProvider } from './openai-provider.js';
import { AI_PROVIDER } from './ai.provider.js';

@Module({
  providers: [
    AIService,
    OpenAIProvider,
    { provide: AI_PROVIDER, useExisting: OpenAIProvider },
  ],
  exports: [AIService],
})
export class AiModule {}

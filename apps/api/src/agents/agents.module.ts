import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ConversationsModule } from '../conversations/conversations.module.js';
import { AgentService } from './agent.service.js';

@Module({
  imports: [DatabaseModule, AiModule, ConversationsModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentsModule {}

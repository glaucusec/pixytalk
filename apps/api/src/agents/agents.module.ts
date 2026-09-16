import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ConversationsModule } from '../conversations/conversations.module.js';
import { AgentManagementController } from './agent-management.controller.js';
import { AgentManagementService } from './agent-management.service.js';
import { AgentService } from './agent.service.js';
import { AGENT_TOOLS, type AgentTool } from './tools/agent-tool.js';
import { CalculatePriceTool } from './tools/calculate-price.tool.js';
import { ToolRegistryService } from './tools/tool-registry.service.js';

@Module({
  imports: [DatabaseModule, AiModule, ConversationsModule],
  controllers: [AgentManagementController],
  providers: [
    AgentService,
    AgentManagementService,
    CalculatePriceTool,
    {
      provide: AGENT_TOOLS,
      inject: [CalculatePriceTool],
      useFactory: (calculatePrice: CalculatePriceTool): AgentTool[] => [
        calculatePrice,
      ],
    },
    ToolRegistryService,
  ],
  exports: [AgentService],
})
export class AgentsModule {}

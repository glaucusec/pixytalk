import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  OrgRoles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { AgentManagementService } from './agent-management.service.js';
import { ConfigureAgentToolDto } from './dto/configure-agent-tool.dto.js';
import { CreateKnowledgeEntryDto } from './dto/create-knowledge-entry.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';

@Controller('agent')
@OrgRoles(['owner', 'admin'])
export class AgentManagementController {
  constructor(private readonly agentManagement: AgentManagementService) {}

  @Get()
  getCurrent(@Session() session: UserSession) {
    return this.agentManagement.getCurrent(this.organizationId(session));
  }

  @Put()
  updateCurrent(
    @Session() session: UserSession,
    @Body() input: UpdateAgentDto,
  ) {
    return this.agentManagement.updateCurrent(
      this.organizationId(session),
      input,
    );
  }

  @Get('knowledge')
  listKnowledge(@Session() session: UserSession) {
    return this.agentManagement.listKnowledge(this.organizationId(session));
  }

  @Post('knowledge')
  createKnowledge(
    @Session() session: UserSession,
    @Body() input: CreateKnowledgeEntryDto,
  ) {
    return this.agentManagement.createKnowledge(
      this.organizationId(session),
      input,
    );
  }

  @Get('tools')
  listTools(@Session() session: UserSession) {
    return this.agentManagement.listTools(this.organizationId(session));
  }

  @Put('tools/:name')
  configureTool(
    @Session() session: UserSession,
    @Param('name') name: string,
    @Body() input: ConfigureAgentToolDto,
  ) {
    return this.agentManagement.configureTool(
      this.organizationId(session),
      name,
      input,
    );
  }

  private organizationId(session: UserSession): string {
    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      throw new BadRequestException('No active organization selected');
    }
    return organizationId;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
export class AgentManagementController {
  constructor(private readonly agentManagement: AgentManagementService) {}

  @Get()
  @OrgRoles(['owner', 'admin', 'agent'])
  getCurrent(@Session() session: UserSession) {
    return this.agentManagement.getCurrent(this.organizationId(session));
  }

  @Put()
  @OrgRoles(['owner', 'admin'])
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
  @OrgRoles(['owner', 'admin', 'agent'])
  listKnowledge(@Session() session: UserSession) {
    return this.agentManagement.listKnowledge(this.organizationId(session));
  }

  @Post('knowledge')
  @OrgRoles(['owner', 'admin'])
  createKnowledge(
    @Session() session: UserSession,
    @Body() input: CreateKnowledgeEntryDto,
  ) {
    return this.agentManagement.createKnowledge(
      this.organizationId(session),
      input,
    );
  }

  @Delete('knowledge/:id')
  @OrgRoles(['owner', 'admin'])
  deleteKnowledge(@Session() session: UserSession, @Param('id') id: string) {
    return this.agentManagement.deleteKnowledge(
      this.organizationId(session),
      id,
    );
  }

  @Get('tools')
  @OrgRoles(['owner', 'admin', 'agent'])
  listTools(@Session() session: UserSession) {
    return this.agentManagement.listTools(this.organizationId(session));
  }

  @Put('tools/:name')
  @OrgRoles(['owner', 'admin'])
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

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  OrgRoles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { ConversationsService } from './conversations.service.js';
import { ListConversationsDto } from './dto/list-conversations.dto.js';
import { ListMessagesDto } from './dto/list-messages.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { UpdateConversationModeDto } from './dto/update-conversation-mode.dto.js';

@Controller('conversations')
@OrgRoles(['owner', 'admin', 'agent'])
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @Session() session: UserSession,
    @Query() query: ListConversationsDto,
  ) {
    return this.conversationsService.findAll(
      this.organizationId(session),
      query,
    );
  }

  @Get(':id')
  findOne(@Session() session: UserSession, @Param('id') id: string) {
    return this.conversationsService.findOne(this.organizationId(session), id);
  }

  @Get(':id/messages')
  findMessages(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.conversationsService.findMessages(
      this.organizationId(session),
      id,
      query,
    );
  }

  @Post(':id/messages')
  sendMessage(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() input: SendMessageDto,
  ) {
    return this.conversationsService.sendText(
      this.organizationId(session),
      id,
      input.text,
    );
  }

  @Patch(':id/mode')
  updateMode(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() input: UpdateConversationModeDto,
  ) {
    return this.conversationsService.updateMode(
      this.organizationId(session),
      id,
      session.user.id,
      input.mode,
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

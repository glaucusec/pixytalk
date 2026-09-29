import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { ConfigureWhatsAppAccountDto } from './dto/configure-whatsapp-account.dto.js';
import {
  OrgRoles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @OrgRoles(['owner', 'admin', 'agent'])
  findCurrent(@Session() session: UserSession) {
    return this.organizationsService.findById(this.organizationId(session));
  }

  @Get('current/whatsapp')
  @OrgRoles(['owner', 'admin', 'agent'])
  getCurrentWhatsAppAccount(@Session() session: UserSession) {
    return this.organizationsService.getWhatsAppAccount(
      this.organizationId(session),
    );
  }

  @Put('current/whatsapp')
  @OrgRoles(['owner', 'admin'])
  configureCurrentWhatsAppAccount(
    @Session() session: UserSession,
    @Body() input: ConfigureWhatsAppAccountDto,
  ) {
    return this.organizationsService.configureWhatsAppAccount(
      this.organizationId(session),
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

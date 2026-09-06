import { BadRequestException, Controller, Get } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
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
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('No active organization selected');
    }

    return this.organizationsService.findById(organizationId);
  }
}

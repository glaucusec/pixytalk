import { Module } from '@nestjs/common';
import { OrganizationsModule } from './organizations/organizations.module.js';

@Module({
  imports: [OrganizationsModule],
})
export class AppModule {}

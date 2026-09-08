import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { auth } from './auth/auth.js';
import { WhatsappModule } from './whatsapp/whatsapp.module.js';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: {
          limit: '1mb',
        },
        urlencoded: {
          limit: '1mb',
          extended: true,
        },
        rawBody: true,
      },
    }),
    OrganizationsModule,
    WhatsappModule,
  ],
})
export class AppModule {}

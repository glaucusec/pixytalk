import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { ConfigureWhatsAppAccountDto } from './dto/configure-whatsapp-account.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        whatsAppAccounts: {
          select: { id: true, displayPhoneNumber: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 1,
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const { whatsAppAccounts, ...details } = organization;
    return {
      ...details,
      whatsappConfigured: whatsAppAccounts.length > 0,
      whatsappDisplayPhoneNumber:
        whatsAppAccounts[0]?.displayPhoneNumber ?? null,
    };
  }

  async getWhatsAppAccount(organizationId: string) {
    return this.prisma.whatsAppAccount.findFirst({
      where: { organizationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        phoneNumberId: true,
        wabaId: true,
        displayPhoneNumber: true,
      },
    });
  }

  async configureWhatsAppAccount(
    organizationId: string,
    input: ConfigureWhatsAppAccountDto,
  ) {
    const existing = await this.prisma.whatsAppAccount.findUnique({
      where: { phoneNumberId: input.phoneNumberId },
    });
    if (existing && existing.organizationId !== organizationId) {
      throw new ConflictException(
        'This WhatsApp number is already connected to another workspace',
      );
    }

    if (existing) {
      return this.prisma.whatsAppAccount.update({
        where: { id: existing.id },
        data: {
          wabaId: input.wabaId,
          displayPhoneNumber: input.displayPhoneNumber ?? null,
        },
        select: {
          id: true,
          phoneNumberId: true,
          wabaId: true,
          displayPhoneNumber: true,
        },
      });
    }

    const currentAccount = await this.prisma.whatsAppAccount.findFirst({
      where: { organizationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, phoneNumberId: true },
    });
    if (currentAccount) {
      return this.prisma.whatsAppAccount.update({
        where: { id: currentAccount.id },
        data: {
          phoneNumberId: input.phoneNumberId,
          wabaId: input.wabaId,
          displayPhoneNumber: input.displayPhoneNumber ?? null,
        },
        select: {
          id: true,
          phoneNumberId: true,
          wabaId: true,
          displayPhoneNumber: true,
        },
      });
    }

    return this.prisma.whatsAppAccount.create({
      data: {
        organizationId,
        phoneNumberId: input.phoneNumberId,
        wabaId: input.wabaId,
        displayPhoneNumber: input.displayPhoneNumber ?? null,
      },
      select: {
        id: true,
        phoneNumberId: true,
        wabaId: true,
        displayPhoneNumber: true,
      },
    });
  }
}

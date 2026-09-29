import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { OrganizationsService } from './organizations.service.js';

describe('OrganizationsService', () => {
  const organization = {
    id: '3fdc1c70-1943-4c31-a7e1-c1a783e176b4',
    name: 'PixyTalk',
    slug: 'pixytalk',
    createdAt: new Date('2026-09-05T00:00:00.000Z'),
    logo: null,
    metadata: null,
  };

  const prisma = {
    organization: {
      findUnique: vi.fn(),
    },
    whatsAppAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService(prisma as unknown as PrismaService);
  });

  it('returns an organization by id', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      ...organization,
      whatsAppAccounts: [],
    });

    await expect(service.findById(organization.id)).resolves.toEqual({
      ...organization,
      whatsappConfigured: false,
      whatsappDisplayPhoneNumber: null,
    });
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: organization.id },
      include: {
        whatsAppAccounts: {
          select: { id: true, displayPhoneNumber: true },
          take: 1,
        },
      },
    });
  });

  it('throws NotFoundException when an organization does not exist', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.findById(organization.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not assign a WhatsApp number that belongs to another tenant', async () => {
    prisma.whatsAppAccount.findUnique.mockResolvedValue({
      id: 'account-1',
      organizationId: 'other-organization',
    });

    await expect(
      service.configureWhatsAppAccount('organization-1', {
        phoneNumberId: '12345678',
        wabaId: '87654321',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.whatsAppAccount.create).not.toHaveBeenCalled();
  });

  it('creates a WhatsApp mapping scoped to the current organization', async () => {
    prisma.whatsAppAccount.findUnique.mockResolvedValue(null);
    prisma.whatsAppAccount.findFirst.mockResolvedValue(null);
    prisma.whatsAppAccount.create.mockResolvedValue({
      id: 'account-1',
      phoneNumberId: '12345678',
      wabaId: '87654321',
      displayPhoneNumber: '+1555010200',
    });

    await expect(
      service.configureWhatsAppAccount('organization-1', {
        phoneNumberId: '12345678',
        wabaId: '87654321',
        displayPhoneNumber: '+1555010200',
      }),
    ).resolves.toEqual({
      id: 'account-1',
      phoneNumberId: '12345678',
      wabaId: '87654321',
      displayPhoneNumber: '+1555010200',
    });
    expect(prisma.whatsAppAccount.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'organization-1',
        phoneNumberId: '12345678',
        wabaId: '87654321',
        displayPhoneNumber: '+1555010200',
      },
      select: {
        id: true,
        phoneNumberId: true,
        wabaId: true,
        displayPhoneNumber: true,
      },
    });
  });
});

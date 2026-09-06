import { NotFoundException } from '@nestjs/common';
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
  };

  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService(prisma as unknown as PrismaService);
  });

  it('returns an organization by id', async () => {
    prisma.organization.findUnique.mockResolvedValue(organization);

    await expect(service.findById(organization.id)).resolves.toEqual(
      organization,
    );
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: organization.id },
    });
  });

  it('throws NotFoundException when an organization does not exist', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.findById(organization.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { OrganizationsService } from './organizations.service.js';

describe('OrganizationsService', () => {
  const organization = {
    id: '3fdc1c70-1943-4c31-a7e1-c1a783e176b4',
    name: 'PixyTalk',
    slug: 'pixytalk',
    createdAt: new Date('2026-09-05T00:00:00.000Z'),
    updatedAt: new Date('2026-09-05T00:00:00.000Z'),
  };

  const prisma = {
    organization: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService(prisma as unknown as PrismaService);
  });

  it('creates an organization with a trimmed name', async () => {
    prisma.organization.create.mockResolvedValue(organization);

    await expect(
      service.create({ name: '  PixyTalk  ', slug: 'pixytalk' }),
    ).resolves.toEqual(organization);
    expect(prisma.organization.create).toHaveBeenCalledWith({
      data: { name: 'PixyTalk', slug: 'pixytalk' },
    });
  });

  it('throws ConflictException for a duplicate slug', async () => {
    prisma.organization.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      service.create({ name: 'PixyTalk', slug: 'pixytalk' }),
    ).rejects.toThrow(ConflictException);
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

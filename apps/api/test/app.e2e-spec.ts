import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication<App>;

  const organization = {
    id: '3fdc1c70-1943-4c31-a7e1-c1a783e176b4',
    name: 'PixyTalk',
    slug: 'pixytalk',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
  };

  const prisma = {
    organization: {
      findUnique: vi.fn().mockResolvedValue(organization),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/organizations/:id (GET)', () => {
    return request(app.getHttpServer())
      .get(`/organizations/${organization.id}`)
      .expect(200)
      .expect(organization);
  });

  afterEach(async () => {
    await app.close();
  });
});

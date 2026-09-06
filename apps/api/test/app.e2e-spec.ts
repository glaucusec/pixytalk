import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';

describe('Authentication and organization access (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    await app.init();
  });

  it('rejects an unauthenticated organization request', () => {
    return request(app.getHttpServer())
      .get('/organizations/current')
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});

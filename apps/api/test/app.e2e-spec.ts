import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createHmac } from 'node:crypto';
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

describe('WhatsApp webhook (e2e)', () => {
  let app: INestApplication<App>;
  const verifyToken = 'test-webhook-verify-token';
  const appSecret = 'test-meta-app-secret';

  beforeEach(async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verifyToken;
    process.env.META_APP_SECRET = appSecret;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    await app.init();
  });

  it('returns Meta webhook verification challenges', () => {
    return request(app.getHttpServer())
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': 'challenge-123',
      })
      .expect(200)
      .expect('challenge-123');
  });

  it('rejects an incorrect webhook verification token', () => {
    return request(app.getHttpServer())
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'incorrect',
        'hub.challenge': 'challenge-123',
      })
      .expect(403);
  });

  it('accepts a correctly signed status-only webhook', async () => {
    const rawBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [],
    });
    const signature =
      'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', signature)
      .send(rawBody)
      .expect(200)
      .expect({
        received: true,
        processed: 0,
        duplicates: 0,
        statusesUpdated: 0,
        unmatchedStatuses: 0,
      });
  });

  it('rejects an invalid POST signature', () => {
    return request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', 'sha256=invalid')
      .send({ object: 'whatsapp_business_account', entry: [] })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});

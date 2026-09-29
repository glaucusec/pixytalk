# Deployment

PixyTalk ships as two applications and two stateful services:

```text
Next.js web app → NestJS API → PostgreSQL
                            → Redis / BullMQ
```

The API process hosts the webhook, REST API, realtime gateway, and durable queue
publisher. A separate worker process consumes BullMQ jobs. The database outbox
makes inbound processing recoverable if Redis is unavailable when a webhook is
stored. The API is ready only when both PostgreSQL and Redis respond.

## Local full-stack run

1. Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET` to a random value
   of at least 32 characters. Add Meta and AI credentials only when using those
   integrations.
2. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d postgres redis
   ```

3. Set `apps/api/.env` to use the local database. Run migrations and generate
   the Prisma client:

   ```bash
   pnpm --filter @pixytalk/api db:migrate
   pnpm --filter @pixytalk/api db:generate
   ```

4. Start the containerized web and API apps:

   ```bash
   docker compose --profile app up --build
   ```

Open `http://localhost:3000`. The API liveness endpoint is
`http://localhost:3001/health/live`; readiness is
`http://localhost:3001/health/ready`.

Alternatively, run `pnpm dev` and `pnpm dev:worker` from separate host
terminals after starting PostgreSQL and Redis. Configure `apps/api/.env` and
`apps/web/.env` from their respective examples.

## Production release

Build the API and web images from the repository root using the Dockerfiles in
`apps/api` and `apps/web`. Set `NEXT_PUBLIC_API_URL` to the public HTTPS API URL
at web image build time; Next.js embeds public environment values in client
bundles during the build.

Provision managed PostgreSQL and Redis, then configure the API with:

- `DATABASE_URL` and `REDIS_URL` for managed services;
- `BETTER_AUTH_SECRET` with a unique random secret;
- `BETTER_AUTH_URL` and `WEB_URL` using HTTPS;
- `AUTH_COOKIE_SAME_SITE=lax` when the dashboard and API share a site, or
  `none` only when they are cross-site (Secure cookies are enforced in
  production);
- Meta webhook verification token, app secret, access token, and graph API
  version;
- AI provider keys and the automatic reply switch, enabled only after
  end-to-end checks.

Run `pnpm --filter @pixytalk/api db:migrate:deploy` as a release step against
the production database before routing traffic to the new API image. Do not run
development migrations against production. Keep secrets in the hosting
provider's secret store, not in image build arguments or source control.

Deploy at least one API process and one worker process from the API image.
Additional API and worker replicas can share the same Redis queue and database.
Configure the hosting platform’s liveness probe to `/health/live` and
readiness probe to `/health/ready`. The web image includes `/api/health` for a basic liveness
probe.

## External setup still required

The repository cannot provision cloud resources or register a Meta app. A
production launch still needs a selected hosting provider, managed PostgreSQL
and Redis instances, DNS/TLS, Meta webhook configuration, and real credentials.
After configuring those, verify signup, tenant isolation, inbound and outbound
WhatsApp, automatic replies, human takeover, queue retry, and restart recovery
against the production-like environment.

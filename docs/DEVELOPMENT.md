# Development

## Workspace

PixyTalk is a pnpm monorepo. Turborepo coordinates tasks across applications and caches successful builds, lint checks, and unit tests.

```text
apps/web/              Next.js frontend (@pixytalk/web)
apps/api/              NestJS backend (@pixytalk/api)
docs/                  Project documentation
package.json           Root commands and development tooling
pnpm-workspace.yaml    Workspace membership and install settings
pnpm-lock.yaml         Shared dependency lockfile
turbo.json             Task dependencies and caching
```

The workspace also recognizes `packages/*` for future shared packages. Create these only when shared code is needed. Each application keeps its own dependencies and framework configuration.

## Setup

Use Node.js 24 (`nvm use` if using nvm) and pnpm 11.9.0. Run `pnpm install` from the repository root. CI should use `pnpm install --frozen-lockfile`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run both applications in watch mode |
| `pnpm dev:web` | Run only the frontend on port 3000 |
| `pnpm dev:api` | Run only the API on port 3001 |
| `pnpm build` | Build both applications |
| `pnpm lint` | Run each application's linter |
| `pnpm typecheck` | Generate Next.js types and check both apps |
| `pnpm test` | Run available unit tests (currently the API) |
| `pnpm test:e2e` | Run available end-to-end tests (currently the API) |
| `pnpm check` | Run lint, types, unit tests, builds, then end-to-end tests |

The API honors `PORT` when set. For app-specific dependency changes, use `pnpm --filter @pixytalk/api add <package>` or `pnpm --filter @pixytalk/web add <package>`. Add root tooling with `pnpm add -Dw <package>`.

## Conventions

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commit messages and the review workflow. `pnpm install` installs Husky hooks for staged-diff checks, commit-message validation, and full pre-push verification. Use `pnpm prepare` to reinstall hooks in an existing checkout. CI and production-only installs skip hook setup.

- Keep one root lockfile and one root workspace configuration.
- Commit source, configuration, lockfiles, and database migrations.
- Keep real environment files, build output, dependencies, and `.turbo` caches out of Git.
- Commit sanitized `.env.example` files when environment settings are introduced.
- Development and end-to-end tests are not cached. Type checking is also uncached because Next.js generates local route types.
- Environment files invalidate cached tasks. Declare additional runtime/build variables in Turbo's task configuration when integrations are added; listing a file does not load it into a process.
- Keep framework-specific TypeScript and lint settings in each app for now.

## Deployment boundaries

A shared repository does not require a shared deployment. The frontend and API can deploy independently. After building, run `pnpm --filter @pixytalk/web start` or `pnpm --filter @pixytalk/api start:prod`. A separate background worker process will be added when queue processing is implemented.

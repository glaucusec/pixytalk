# Contributing to PixyTalk

PixyTalk is an early-stage project. Keep changes focused on the current MVP and discuss substantial features or architectural changes before implementing them.

## Get started

Read the [README](README.md) and [development guide](docs/DEVELOPMENT.md). Use Node.js 24 and the pnpm version pinned in the root `package.json`.

```bash
pnpm install
pnpm dev
```

Installation sets up Husky hooks: `pre-commit` checks the staged diff for whitespace errors and conflict markers, `commit-msg` validates Conventional Commits, and `pre-push` runs `pnpm check`. CI repeats full verification for pull requests. Hooks report errors rather than automatically rewriting or staging files.

## Working on a change

1. Start from the latest `main` and create a short-lived branch, such as `feat/organization-api`, `fix/inbox-order`, or `docs/local-setup`. Automated Codex work uses `codex/<description>`.
2. Keep each pull request focused on one problem. Avoid unrelated formatting or dependency updates.
3. Follow the existing app's conventions. Keep business rules in the backend and tenant-specific behavior in configuration, data, or tools.
4. Add meaningful tests for new behavior and bug fixes, especially tenant access, duplicate events, and state transitions. Documentation-only changes do not require invented application tests.
5. Update affected documentation and sanitized environment examples.
6. Review the diff, run relevant checks, and open a pull request using the template.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
type(scope): short description
```

The scope is optional. Use a clear action, keep the header within 100 characters, and omit a trailing period.

| Type | Use |
| --- | --- |
| `feat` | New functionality |
| `fix` | A bug fix |
| `docs` | Documentation |
| `refactor` | Restructuring without intentional behavior changes |
| `test` | Tests |
| `perf` | Performance improvements |
| `build` | Build tools or dependency configuration |
| `ci` | CI workflows |
| `style` | Formatting-only changes |
| `chore` | Other maintenance |
| `revert` | Reverting a change |

Useful scopes include `web`, `api`, `repo`, `deps`, `auth`, and `inbox`; scopes are not restricted to this list.

```text
feat(api): add organization creation
fix(inbox): preserve chronological message order
docs(repo): explain local development
build(repo): configure pnpm and turborepo
```

Use the body to explain why the change is needed. Mark incompatible changes with `!` after the type/scope and describe migration steps in a `BREAKING CHANGE:` footer. Avoid messages such as `updates` or `fix stuff`.

## Before opening a pull request

```bash
git diff --check
pnpm check
```

`pnpm check` runs lint, types, and unit tests, then builds, then end-to-end tests. Type generation and production builds run sequentially to avoid competing over Next.js output files.

Inspect `git diff --staged` before committing. Never commit credentials, actual customer conversations, database dumps, dependencies, or build output. Include the root lockfile when changing dependencies.

## Pull requests and review

- Use a Conventional Commit title; CI validates it because the title should become the squash commit message.
- Describe the problem, resulting behavior, and how you verified it. Add screenshots for visible UI changes and migration notes when applicable.
- Open a draft PR when feedback would help before the work is ready.
- Address review feedback and wait for the required checks before merging.
- Prefer squash merging with the PR title, then delete the branch. Do not rewrite shared `main` history.

Local hooks are convenience checks, not a security boundary. GitHub rulesets must enforce merge checks; repository files alone cannot enable those settings. See [repository maintenance](docs/REPOSITORY_MAINTENANCE.md).

## Community and security

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities using the [security policy](SECURITY.md), not a public issue containing exploit details.

## Licensing

An open-source license has not yet been selected. These contribution practices do not grant an open-source license. The maintainer should establish licensing and contribution terms before soliciting external code contributions.

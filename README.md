<p align="center">
  <img src="docs/assets/pixytalk-icon.svg" alt="PixyTalk icon" width="88" height="88" />
</p>

<h1 align="center">PixyTalk</h1>

<p align="center">
  <strong>Customer conversations. AI assistance. A human touch.</strong>
</p>

<p align="center">
  A shared inbox for businesses to manage customer conversations with AI assistance,<br />
  starting with WhatsApp.
</p>

<p align="center">
  <strong>Status:</strong> MVP in development · <strong>First channel:</strong> WhatsApp
</p>

---

## About

PixyTalk is being built to help businesses respond to customers, keep conversations organized, and bring their team into the conversation whenever personal attention is needed.

The goal is simple: let AI handle routine enquiries using the business’s own information, while people stay in control.

## The first release

The MVP is planned around five core capabilities:

| Capability             | What it means for your business                                                     |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Shared inbox**       | Read and reply to WhatsApp conversations in one place.                              |
| **AI assistance**      | Answer routine questions using your business information and conversation history.  |
| **Business knowledge** | Give the assistant your FAQs, services, and policies.                               |
| **Trusted answers**    | Use business rules and connected tools for facts such as pricing.                   |
| **Human takeover**     | Step into a conversation, pause AI replies, and resume assistance when appropriate. |

Each business will have its own workspace, team access, conversations, and assistant settings.

## How it will work

1. A customer sends your business a WhatsApp message.
2. The conversation appears in your PixyTalk inbox.
3. Your AI assistant uses your business knowledge and available tools to respond.
4. Your team can take over and reply personally whenever needed.

## Built for different businesses

Kerala Tripist is the first planned pilot customer. PixyTalk is being designed as a platform that other businesses can configure with their own knowledge, tools, and workflows.

## Project status

The first MVP is implemented in the repository: workspace authentication and
onboarding, a WhatsApp inbox, tenant-configurable assistant knowledge, trusted
pricing tools, human takeover, queued inbound processing, and deployment
configuration. A production pilot still needs real Meta and AI credentials,
hosted infrastructure, and end-to-end verification against those services.

Kerala Tripist is a sample workspace, not a hardcoded product dependency.

## Local development

The repository uses pnpm workspaces and Turborepo to run the frontend and backend together. Use Node.js 24 and pnpm 11.9.0.

From the repository root:

```bash
pnpm install
pnpm dev
```

Run `pnpm dev:worker` in a second terminal to process inbound messages. The
frontend runs at `http://localhost:3000` and the API at
`http://localhost:3001`. Start PostgreSQL and Redis and apply the Prisma
migrations first; see the development and deployment guides for configuration.

See [the development guide](docs/DEVELOPMENT.md) for workspace commands and structure.
See [the deployment guide](docs/DEPLOYMENT.md) for the Docker-based full-stack
workflow, migrations, health probes, and production environment configuration.

## What comes next

The next roadmap items are easier onboarding, team invitations, and additional integrations. Additional channels and advanced automation can follow as product needs become clearer.

## Working on PixyTalk

Read the [contribution guide](CONTRIBUTING.md) for branch names, commit messages, checks, and pull requests. Project spaces follow our [Code of Conduct](CODE_OF_CONDUCT.md); vulnerabilities should follow the [security policy](SECURITY.md).

An open-source license has not yet been selected.

# 🚀 LaunchPad

**Mission control for solo builders and micro-teams.**

A lightweight, AI-powered project management tool with a Kanban board, natural language task creation, board sharing, and GitHub integration.

🔗 **Live:** [launchpad.willowmindllc.tech](https://launchpad.willowmindllc.tech) *(coming soon)*
📖 **Docs:** [docs.launchpad.willowmindllc.tech](https://docs.launchpad.willowmindllc.tech) *(coming soon)*

> Built by [Willowmind LLC](https://willowmindllc.tech)

---

## Monorepo Structure

```
launchpad/
├── apps/
│   ├── web/          ← Next.js app
│   └── docs/         ← Fumadocs documentation site
├── packages/
│   └── config/       ← Shared ESLint, TypeScript, Tailwind configs
├── turbo.json        ← Turborepo configuration
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+

### Install

```bash
git clone https://github.com/willowmindllc/launchpad.git
cd launchpad
pnpm install
```

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

See `apps/web/.env.example` for required variables.

### Development

```bash
# Run all apps
pnpm dev

# Run specific app
pnpm --filter @launchpad/web dev
pnpm --filter @launchpad/docs dev
```

### Build

```bash
# Build all
pnpm build

# Build specific app
pnpm --filter @launchpad/web build
```

### Test

```bash
# E2E tests (requires BASE_URL)
cd apps/web
BASE_URL="http://localhost:3000" npx playwright test
```

## Features

### Core
- **Kanban Board** — Drag-and-drop tasks across Backlog → In Progress → Review → Done
- **Chat-to-Board** — Describe your project in natural language, AI creates the tasks
- **AI Task Suggestions** — Generate task breakdowns with multi-provider AI (Anthropic, Gemini, OpenAI, Groq)
- **Board Sharing** — Invite collaborators via email with role-based access (Viewer, Commenter, Editor)
- **GitHub Integration** — Link repos, sync webhooks, reference PRs in tasks

### Task Management
- **Task Search & Filter** — Search by title/description, filter by priority, `/` keyboard shortcut
- **Bulk Task Actions** — Select multiple tasks, batch move/priority/delete with floating action bar
- **Smart Sorting** — Backlog ascending by ticket number, active columns show latest work on top
- **Auto-Numbering** — New tasks automatically get the next ticket number
- **Task Comments & Activity Log** — Discussion threads + automatic change tracking via Postgres triggers
- **Soft Delete & Trash** — Recover accidentally deleted tasks, auto-purge after 7 days

### Project Management
- **Project Settings** — Edit name/description, danger zone for destructive actions
- **Project Archive & Auto-Delete** — Archive projects with 7-day countdown before permanent deletion
- **Dashboard Stats** — Task counts, "Done This Week" streak, collaborator-aware views

### Power User
- **Keyboard Shortcuts** — `N` new task, `/` search, `?` help, `1-4` switch columns, `Esc` close
- **Export CSV** — Download tasks for reporting or backup
- **E2E Testing** — Playwright test suite

### Platform
- **Multi-Auth** — Email/password, GitHub OAuth, Google OAuth
- **Dark Mode** — Dark theme by default
- **Mobile Responsive** — Tab-based single column view on mobile

## Tech Stack

| Layer | Tech |
|-------|------|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Components | shadcn/ui |
| Backend | Supabase (Postgres + Auth + RLS + pg_cron) |
| AI | Multi-provider: Anthropic, Gemini, OpenAI, Groq |
| Docs | Fumadocs |
| Hosting | Vercel |
| Testing | Playwright |
| CI | GitHub Actions |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](./SECURITY.md) for our responsible disclosure policy.

## License

MIT — see [LICENSE](./LICENSE) for details.

---

Built with 🔱 by [Willowmind LLC](https://willowmindllc.tech)

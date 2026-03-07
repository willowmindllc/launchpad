# 🚀 LaunchPad

**Mission control for solo builders and micro-teams.**

A lightweight, AI-powered project management tool with a Kanban board, natural language task creation, board sharing, and GitHub integration.

🔗 **Live:** [launchpad.willowmindllc.tech](https://launchpad.willowmindllc.tech)
📖 **Docs:** [docs-launchpad.willowmindllc.tech](https://docs-launchpad.willowmindllc.tech)

---

## Features

### Core
- **Kanban Board** — Drag-and-drop tasks across Backlog → In Progress → Review → Done
- **Chat-to-Board** — Describe your project in natural language, AI creates the tasks
- **AI Task Suggestions** — Generate task breakdowns with multi-provider AI (Anthropic, Gemini, OpenAI, Groq)
- **Board Sharing** — Invite collaborators via email with role-based access (Viewer, Commenter, Editor)
- **GitHub Integration** — Link repos, sync webhooks, reference PRs in tasks

### Task Management
- **Ticket Permalinks** — Shareable deep links to any task
- **Task Comments & Activity Log** — Discussion threads + automatic change tracking via Postgres triggers
- **Soft Delete & Trash** — Recover accidentally deleted tasks, auto-purge after 7 days
- **Task Search & Filter** — Search by title/description, filter by priority, `/` keyboard shortcut to focus
- **Bulk Task Actions** — Select multiple tasks, batch move/priority/delete with floating action bar
- **Smart Sorting** — Backlog sorted ascending by ticket number, active columns show latest work on top
- **Auto-Numbering** — New tasks automatically get the next ticket number (LP-044, LP-045, etc.)

### Project Management
- **Project Settings** — Edit name/description, danger zone for destructive actions
- **Project Archive & Auto-Delete** — Archive projects with 7-day countdown before permanent deletion
- **Dashboard Stats** — Task counts, "Done This Week" streak, collaborator-aware views
- **Rich Empty States** — Guided onboarding for new users and collaborators
- **Invite Welcome Experience** — Dismissible banner when joining via invite link

### Power User
- **Keyboard Shortcuts** — `N` new task, `/` search, `?` help, `1-4` switch columns, `Esc` close
- **Export CSV** — Download tasks for reporting or backup
- **E2E Testing** — Playwright test suite for smoke tests and feature verification

### Platform
- **Multi-Auth** — Email/password, GitHub OAuth, Google OAuth
- **Dark Mode** — Dark theme by default
- **Mobile Responsive** — Tab-based single column view on mobile (<768px), collapsible sidebar

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Components | shadcn/ui (New York style, Zinc palette) |
| Backend | Supabase (Postgres + Auth + RLS + pg_cron) |
| AI | Multi-provider: Anthropic, Gemini, OpenAI, Groq |
| Email | Resend (invite notifications) |
| Hosting | Vercel (auto-deploy from `main`) |
| DnD | @dnd-kit (cross-column + reorder + touch) |
| Testing | Playwright (headless e2e) |
| CI | GitHub Actions (PR review bot + code review) |

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (package manager)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (optional, for deployment)

### 1. Clone & Install

```bash
git clone https://github.com/willowmindllc/launchpad.git
cd launchpad
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run all migrations in order from `supabase/migrations/`
3. Enable desired OAuth providers in **Authentication → Providers**:
   - **GitHub OAuth** — add Client ID + Secret, callback: `https://your-domain/auth/callback`
   - **Google OAuth** — add Client ID + Secret, callback: `https://your-domain/auth/callback`
4. Add your production URL to **Authentication → URL Configuration → Redirect URLs**

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional — AI features work without these (falls back to demo mode)
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key

# Optional — email invitations for board sharing
RESEND_API_KEY=your-resend-key
```

Find Supabase keys in: **Settings → API**.

### 4. Run Locally

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

### 5. Build & Check

```bash
pnpm build    # Production build
pnpm lint     # ESLint check
```

## Deployment

### Vercel (Recommended)

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variables (see `.env.example`)
3. Deploy — every push to `main` auto-deploys

Or via CLI:
```bash
pnpm vercel --prod
```

### Supabase Migrations

Apply all migrations to your remote database:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or paste each SQL file from `supabase/migrations/` into the Supabase SQL Editor.

## Project Structure

```
launchpad/
├── docs/                    # Feature documentation (numbered)
│   └── specs/               # Feature specs (design-first workflow)
├── supabase/migrations/     # Database migrations (SQL)
├── tests/e2e/               # Playwright end-to-end tests
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login & signup pages
│   │   ├── (dashboard)/     # Dashboard, projects, board, settings
│   │   ├── api/             # API routes (invites, GitHub, AI)
│   │   ├── auth/callback/   # OAuth callback handler
│   │   └── invite/accept/   # Invite acceptance page
│   ├── components/
│   │   ├── board/           # Kanban board, task cards, search, bulk actions, shortcuts
│   │   ├── layout/          # Sidebar, header
│   │   ├── project/         # Share dialog
│   │   ├── projects/        # Project list, cards, archive
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks (keyboard shortcuts, etc.)
│   ├── lib/
│   │   ├── supabase/        # Supabase client + queries
│   │   ├── email.ts         # Invite email templates
│   │   ├── export-csv.ts    # CSV export utility
│   │   └── resend.ts        # Resend client
│   └── types/               # TypeScript types
├── .env.example             # Environment variable template
├── .github/workflows/       # CI: PR review bot + code review
├── playwright.config.ts     # E2E test configuration
└── package.json
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase auth) with AI provider settings |
| `projects` | Projects with name, description, owner, `archived_at` for auto-delete |
| `tasks` | Tasks with status, priority, assignee, position, soft delete (`deleted_at`) |
| `project_members` | Membership with roles (owner, admin, member, viewer) |
| `project_invites` | Pending email invitations with token-based acceptance |
| `task_comments` | Discussion threads on tasks |
| `task_activity` | Automatic change log (Postgres trigger-based) |
| `chat_sessions` | Persistent chat history for Chat-to-Board |
| `chat_messages` | Individual messages within chat sessions |
| `github_connections` | GitHub OAuth tokens for repo integration |
| `project_github_links` | Repo-to-project mappings for webhook sync |

All tables use Row Level Security (RLS) — users only see data they have access to. Auto-purge via `pg_cron`: archived projects after 7 days, trashed tasks after 7 days.

## License

MIT — [Willowmind LLC](https://willowmindllc.tech)

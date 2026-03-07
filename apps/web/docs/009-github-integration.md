# 009 — GitHub Integration (LP-002)

## What

Connect GitHub repos to LaunchPad projects for two-way sync between GitHub issues/PRs and the Kanban board.

## Why

Developers live in GitHub. Without integration, you're managing tasks in two places. This bridges the gap — one board to rule them all.

## Core Concept

**One repo = one project board.** You connect GitHub once (OAuth), then link individual repos to LaunchPad projects.

## Features

### 1. GitHub OAuth Connection
- User connects their GitHub account via OAuth (stored on profile)
- Grants read/write access to repos and issues
- Settings page shows connected account with disconnect option

### 2. Repo Linking
- In project settings, pick a repo from your GitHub account
- Each project can link to one repo
- Linking creates a webhook on the repo for inbound events

### 3. Two-Way Sync

**GitHub → LaunchPad (inbound via webhooks):**
- Issue opened → task created in Backlog
- Issue closed → task moved to Done
- Issue labeled → priority mapped (bug=high, enhancement=medium, etc.)
- PR opened referencing a task → PR link auto-commented on task
- PR merged → task moved to Done (or Review)

**LaunchPad → GitHub (outbound via API):**
- Task created → optionally creates a GitHub issue
- Task status changed → updates issue state (open/closed)

### 4. UI Enhancements
- Task card shows GitHub issue number (#42) if linked
- Task detail → Details tab shows linked issue URL, PR URLs
- Project settings → "GitHub" tab for repo connection

## Architecture

```
GitHub Webhooks → POST /api/webhooks/github
  → verify signature (HMAC SHA-256)
  → route by event type (issues, pull_request)
  → create/update tasks via Supabase

LaunchPad Actions → GitHub REST API
  → create issues
  → update issue state
  → list repos for linking
```

## Database

### `github_connections`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | unique |
| access_token | text (encrypted) | GitHub OAuth token |
| github_username | text | |
| github_avatar_url | text | |
| created_at | timestamptz | |

### `project_github_links`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | unique |
| repo_owner | text | e.g. "your-github-username" |
| repo_name | text | e.g. "launchpad" |
| webhook_id | bigint | GitHub webhook ID for cleanup |
| sync_issues | boolean | default true |
| created_at | timestamptz | |

### `tasks` (new columns)
| Column | Type | Notes |
|---|---|---|
| github_issue_number | int | nullable |
| github_issue_url | text | nullable |

## Files (planned)

| File | Purpose |
|---|---|
| `supabase/migrations/20260222_github_integration.sql` | Tables + RLS |
| `src/app/api/auth/github-connect/route.ts` | OAuth flow for GitHub app connection |
| `src/app/api/webhooks/github/route.ts` | Inbound webhook handler |
| `src/app/api/github/repos/route.ts` | List user's repos |
| `src/app/api/github/link/route.ts` | Link/unlink repo to project |
| `src/lib/github.ts` | GitHub API client helpers |
| `src/components/settings/github-settings.tsx` | GitHub connection UI |
| `src/components/project/github-link.tsx` | Repo linking UI in project settings |

## Setup Requirements

- GitHub OAuth App (client ID + secret) in Vercel env vars
- Webhook secret for HMAC verification
- `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET` env vars
- Env vars must be set for **both Production and Preview** environments on Vercel

**Important:** There are TWO separate GitHub OAuth Apps:
1. **Login OAuth** (Supabase handles) — Client ID `Ov23li3g1p7CIaJMkaQk`, callback goes to Supabase
2. **Repo integration OAuth** (LaunchPad handles) — Client ID `Ov23liBQZyI6kCwxVaJv`, callback goes to `/api/auth/github-connect/callback`

## Error Handling & Debugging

The OAuth flow includes:
- **Env var trimming** — strips trailing whitespace/newlines from client ID/secret (common Vercel issue with `echo` vs `printf`)
- **Client ID validation** — rejects malformed IDs before redirecting to GitHub
- **Explicit `redirect_uri`** — always passed in the OAuth URL (not relying on GitHub app defaults)
- **Error catch in callback** — handles `access_denied`, missing code, token exchange failures
- **Debug logging** — logs redirect URL and token exchange status with `[github-connect]` prefix

### Health Check

`GET /api/auth/github-connect/health` — validates OAuth config without starting a flow. Returns:
- Whether client ID and secret are present
- Client ID format validation
- Useful for debugging 404s or misconfigurations

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| GitHub 404 on OAuth | OAuth App deleted or client ID wrong | Verify at github.com/settings/developers |
| Callback fails silently | Missing `GITHUB_APP_CLIENT_SECRET` | Check Vercel env vars |
| Works in prod, fails in preview | Env vars only on Production | Add to Preview environment too |
| Token exchange error | Trailing newline in secret | Use `printf` not `echo` when setting Vercel env vars |

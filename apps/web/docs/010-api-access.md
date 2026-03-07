# LaunchPad API Access

## Overview

LaunchPad's board is backed by Supabase. Since we own the database, any tool or agent can read/write tickets directly via the Supabase REST API. No special LaunchPad API needed.

## Why This Matters

Agents (Mahadev, Claude Code, etc.) can:
- Create tickets when starting a feature
- Move tickets between statuses (backlog → in_progress → done)
- Query the board for project status
- Add comments or update descriptions

All changes show up instantly on the LaunchPad web UI since it reads the same `tasks` table.

## Authentication

Use the **service role key** for API access (bypasses RLS):

```
Authorization: Bearer <SERVICE_ROLE_KEY>
apikey: <SERVICE_ROLE_KEY>
```

Base URL: `https://your-project-ref.supabase.co/rest/v1`

## Common Operations

### Query Tickets by Project

```bash
curl -s "https://your-project-ref.supabase.co/rest/v1/tasks?project_id=eq.<PROJECT_ID>&select=id,title,status&order=created_at.asc" \
  -H "apikey: $LP_KEY" \
  -H "Authorization: Bearer $LP_KEY"
```

### Find a Ticket by Title

```bash
curl -s "https://your-project-ref.supabase.co/rest/v1/tasks?title=like.*MY-008*&select=id,title,status" \
  -H "apikey: $LP_KEY" \
  -H "Authorization: Bearer $LP_KEY"
```

### Move Ticket to In Progress

```bash
curl -s -X PATCH "https://your-project-ref.supabase.co/rest/v1/tasks?id=eq.<TASK_ID>" \
  -H "apikey: $LP_KEY" \
  -H "Authorization: Bearer $LP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

### Move Ticket to Done

```bash
curl -s -X PATCH "https://your-project-ref.supabase.co/rest/v1/tasks?id=eq.<TASK_ID>" \
  -H "apikey: $LP_KEY" \
  -H "Authorization: Bearer $LP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

### Create a New Ticket

```bash
curl -s -X POST "https://your-project-ref.supabase.co/rest/v1/tasks" \
  -H "apikey: $LP_KEY" \
  -H "Authorization: Bearer $LP_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "project_id": "<PROJECT_ID>",
    "title": "MY-020 New Feature",
    "description": "Feature description",
    "status": "backlog",
    "owner_id": "<USER_ID>"
  }'
```

## Status Values

⚠️ Use **underscores**, not hyphens:

| Status | Value |
|--------|-------|
| Backlog | `backlog` |
| In Progress | `in_progress` |
| Done | `done` |

## Project IDs

| Project | ID |
|---------|-----|
| Myla | `6a8a6e47-8c23-4b2b-b3e7-b9bab40c1eba` |
| BuildPulse | `7d1ad879-5406-4e16-898b-63e18fc122df` |

## Tasks Table Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key (auto-generated) |
| `project_id` | uuid | FK to projects |
| `title` | text | Ticket title (e.g. "MY-008 Home Space view") |
| `description` | text | Full description (markdown) |
| `status` | text | `backlog`, `in_progress`, `done` |
| `priority` | text | `urgent`, `high`, `medium`, `low` |
| `owner_id` | uuid | FK to auth.users |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

## Agent Workflow

When spawning an agent for a ticket:

1. **Move ticket to `in_progress`**
2. **Log `agent_started`** to BuildPulse
3. Agent does the work
4. **Log `agent_completed`** to BuildPulse
5. **Move ticket to `done`** (after PR merge)

This keeps both LaunchPad and BuildPulse in sync.

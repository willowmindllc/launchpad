# 013 — Enhanced Dashboard (LP-022)

## What

A proper dashboard with stats, completion tracking, project overview, recent activity, and stale task detection.

## Why

The dashboard is the first thing you see after login. It should give you a complete picture of where things stand — not just a blank page.

## Sections

### Stat Cards (top row)
- **Total Tasks** — across all projects
- **In Progress** — tasks being worked on
- **Completed** — done tasks
- **Overdue** — past due_date and not done (highlighted red if > 0)

### Completion Rate
- Percentage bar showing done vs total
- Visual progress indicator

### My Projects
- Each project with clickable link
- Per-project progress bar (done/total)
- "Active" badge showing in-progress count

### Recent Activity
- Last 10 task changes across all projects
- Shows who did what: "Sam changed status backlog → in_progress"
- Timestamps

### Stale Tasks
- Tasks in backlog for 7+ days
- Shows age in days
- Nudges you to prioritize or archive

## Files

| File | Purpose |
|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard page |
| `src/lib/supabase/queries.ts` | `getDashboardStats()` query |

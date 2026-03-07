# 008 — Task Activity Log & Edit History (LP-028)

## What

Every change to a task (title, status, priority, description, trash/restore) is automatically logged. The task detail sheet shows a unified timeline of comments and activity.

## Why

Sam accidentally edited a ticket title and had no way to see what it was before. Activity logs provide accountability, traceability, and undo context. Standard in every serious PM tool.

## How It Works

### Database — `task_activity` table
- `id` (uuid PK), `task_id` (FK → tasks), `user_id` (FK → auth.users), `action`, `old_value`, `new_value`, `created_at`
- Populated automatically via a Postgres `AFTER UPDATE` trigger on `tasks`
- Trigger function `log_task_changes()` runs as `SECURITY DEFINER` to bypass RLS for inserts
- Tracked actions: `title_changed`, `status_changed`, `priority_changed`, `description_changed`, `trashed`, `restored`
- Description values truncated to 100 chars in the log

### Trigger — `task_changes_trigger`
- Fires on every UPDATE to the `tasks` table
- Compares OLD vs NEW values using `IS DISTINCT FROM`
- Inserts one `task_activity` row per changed field (a single update can produce multiple log entries)
- Uses `auth.uid()` to capture who made the change

### UI — Unified Timeline
- Task detail sheet shows "Activity" section with combined comments + history
- Toggle "Show/Hide history" to filter activity entries
- Comments appear as cards (existing style)
- Activity appears as compact timeline entries: *"Sam changed status from backlog → in_progress"*
- Both sorted chronologically in a single feed

### Queries — `src/lib/supabase/queries.ts`
- `getTaskActivity(supabase, taskId)` — fetch all activity with user profiles

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260222_task_activity.sql` | Table + trigger + RLS |
| `src/types/database.ts` | `TaskActivity` + `TaskActivityAction` types |
| `src/lib/supabase/queries.ts` | `getTaskActivity` query |
| `src/components/board/task-detail-sheet.tsx` | Unified timeline UI |
| `docs/008-task-activity-log.md` | This doc |

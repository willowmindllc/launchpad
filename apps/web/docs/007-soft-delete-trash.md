# 007 — Soft Delete & Trash (LP-027)

## What

Tasks are no longer permanently deleted when you click delete. Instead they're soft-deleted (moved to Trash) and can be restored or permanently removed.

## Why

Accidental deletes happen. In a real project management tool, losing a task with all its context (description, comments, history) is unacceptable. Trash provides a safety net.

## How It Works

### Database
- `deleted_at` column added to `tasks` table (timestamptz, nullable, default null)
- RLS SELECT policy split into two:
  - Active tasks: `deleted_at IS NULL` (normal board view)
  - Deleted tasks: `deleted_at IS NOT NULL` (trash view)
- UPDATE policy allows setting `deleted_at` (for soft-delete and restore)
- DELETE policy allows permanent removal

### Soft Delete Flow
1. User clicks "Move to Trash" in task detail sheet
2. Confirmation dialog appears
3. On confirm: `UPDATE tasks SET deleted_at = now() WHERE id = ...`
4. Task disappears from Kanban board
5. Trash count badge updates in sidebar

### Restore Flow
1. User clicks Trash in sidebar (bottom-left, above user profile)
2. Trash view dialog opens showing all deleted tasks
3. Each task shows: title, priority badge, deleted date
4. "Restore" button → sets `deleted_at = NULL`, task reappears on board
5. "Delete Permanently" button → actual `DELETE FROM tasks`, with confirmation

### Empty Trash
- "Empty Trash" button at top of trash view
- Confirmation dialog warns this is irreversible
- Permanently deletes all trashed tasks for the project

### Queries — `src/lib/supabase/queries.ts`
- `deleteTask(supabase, id)` — soft delete (UPDATE deleted_at = now())
- `restoreTask(supabase, id)` — restore (UPDATE deleted_at = NULL)
- `permanentlyDeleteTask(supabase, id)` — hard delete (DELETE)
- `getDeletedTasks(supabase, projectId)` — fetch trashed tasks

## UI Location

The Trash button lives in the **sidebar** (bottom-left, above the user profile section), not on the board header. This keeps it accessible from any page and follows the pattern of tools like Notion and Linear.

A badge shows the count of trashed items when > 0.

The sidebar communicates with the kanban board via custom events:
- `launchpad:trash-count` — board broadcasts count to sidebar
- `launchpad:open-trash` — sidebar tells board to open trash view

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260222_soft_delete.sql` | Migration: deleted_at column + RLS |
| `supabase/migrations/20260222_fix_soft_delete_rls.sql` | Fix: UPDATE/DELETE RLS policies |
| `src/components/board/trash-view.tsx` | Trash dialog UI |
| `src/components/board/kanban-board-live.tsx` | Trash count + event listeners |
| `src/components/layout/sidebar.tsx` | Trash button in sidebar |
| `src/app/(dashboard)/layout.tsx` | Event bridge between sidebar and board |
| `src/lib/supabase/queries.ts` | Soft delete/restore/permanent delete queries |

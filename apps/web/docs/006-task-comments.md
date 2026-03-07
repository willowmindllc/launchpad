# 006 — Task Comments & PR Links (LP-026)

## What

A comment section inside the task detail sheet where users can post notes, PR links, and discussion threads per task.

## Why

Tasks need context beyond title + description. When you're reviewing work, you need to link the PR, leave notes, ask questions. Without comments, that context lives in Slack/Discord/nowhere.

## How It Works

### Database — `task_comments` table
- `id` (uuid PK), `task_id` (FK → tasks), `user_id` (FK → auth.users), `content` (text), `created_at`
- RLS: users can read/create/delete comments on tasks in projects they have access to
- Cascade delete: deleting a task removes all its comments

### UI — Task Detail Sheet (`src/components/board/task-detail-sheet.tsx`)
- Comments section appears below the Description field
- Each comment shows: user initial avatar, display name, relative timestamp, content
- URLs in comments are auto-linkified (clickable) — especially useful for GitHub PR links
- Text input + "Post" button to add comments
- Delete button (trash icon) on your own comments only
- Comments load on sheet open, refetch after posting/deleting

### Queries — `src/lib/supabase/queries.ts`
- `getTaskComments(supabase, taskId)` — fetch all comments for a task, ordered by created_at
- `createTaskComment(supabase, { task_id, user_id, content })` — insert a comment
- `deleteTaskComment(supabase, commentId)` — delete a comment

## Usage Pattern

1. Open a task → scroll to Comments
2. Paste a PR link: `https://github.com/your-github-username/launchpad/pull/5`
3. It becomes a clickable link automatically
4. Team can discuss, leave notes, track progress per task

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260222_task_comments.sql` | Migration: table + RLS + indexes |
| `src/components/board/task-detail-sheet.tsx` | Comments UI in task sheet |
| `src/lib/supabase/queries.ts` | CRUD queries for comments |

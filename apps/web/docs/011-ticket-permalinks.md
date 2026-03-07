# 011 — Ticket Permalink Pages (TF-001)

## What

Every task now has a dedicated permalink at `/projects/<id>/task/<taskId>`. Clicking a task card on the board navigates to this page instead of opening a side-sheet.

## Why

Tasks previously opened in a side-sheet with no shareable URL. Permalinks enable deep linking from Slack, GitHub PRs, docs, and bookmarks. Standard for any PM tool.

## How It Works

### Route

`src/app/(dashboard)/projects/[id]/task/[taskId]/page.tsx` — server component that:
- Authenticates the user (redirects to `/login` if unauthenticated)
- Fetches the project and task via `getProject` / `getTask`
- Validates `task.project_id === id` (cross-project mismatch → 404)
- Generates `<title>` and OpenGraph metadata: `"<Task Title> | <Project Name> — LaunchPad"`

### Client Wrapper

`task-page-client.tsx` — renders:
- Back button (ArrowLeft) → navigates to `/projects/<id>`
- Copy link button → copies current URL with "Copied!" feedback
- `TaskDetailContent` in a `max-w-2xl` centered layout

### Extracted Component

`TaskDetailContent` was extracted from `TaskDetailSheet` to be reusable. It contains all editing state/handlers, tabs (comments/history/details), and the delete confirmation dialog.

`TaskDetailSheet` is now a thin wrapper: `<Sheet>` + `<TaskDetailContent>`.

### Board Navigation

`KanbanBoardLive.handleTaskClick` now calls `router.push(...)` instead of opening a sheet. The `selectedTask`/`sheetOpen` state and `TaskDetailSheet` JSX were removed from the board.

## Files

| File | Change |
|---|---|
| `src/lib/supabase/queries.ts` | Added `getTask()` — single task by ID with assignee join |
| `src/components/board/task-detail-content.tsx` | **New** — extracted task detail UI |
| `src/components/board/task-detail-sheet.tsx` | Refactored to thin wrapper around `TaskDetailContent` |
| `src/app/(dashboard)/projects/[id]/task/[taskId]/page.tsx` | **New** — server page with metadata |
| `src/app/(dashboard)/projects/[id]/task/[taskId]/task-page-client.tsx` | **New** — client wrapper with back/copy buttons |
| `src/components/board/kanban-board-live.tsx` | Task click navigates to permalink |

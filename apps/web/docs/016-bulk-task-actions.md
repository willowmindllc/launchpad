# LP-038: Bulk Task Actions

## Overview

Adds the ability to select multiple tasks on the Kanban board and perform bulk actions: move to column, change priority, and delete (soft-delete to trash).

## How It Works

### Selection Mode

- A **Select** toggle button appears in the board toolbar (visible to owners/admins only)
- When active, each task card shows a checkbox; clicking a card toggles selection instead of navigating to the task detail
- Drag-and-drop is disabled while selection mode is active to avoid conflicts
- Press **Escape** to exit selection mode and clear the selection

### Bulk Action Bar

A floating bar appears at the bottom of the screen when tasks are selected. It provides:

| Action | Description |
|--------|-------------|
| **Move to** | Move all selected tasks to a chosen column (Backlog, In Progress, Review, Done) |
| **Priority** | Set priority for all selected tasks (Urgent, High, Medium, Low) |
| **Delete** | Soft-delete all selected tasks (with confirmation dialog) |
| **Clear** | Deselect all tasks |

After any bulk action completes, selection mode is exited and the board refreshes.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/supabase/queries.ts` | Added `bulkMoveTasks`, `bulkUpdatePriority`, `bulkDeleteTasks` |
| `src/components/board/bulk-action-bar.tsx` | New component — floating action bar with dropdowns and confirm dialog |
| `src/components/board/kanban-board-live.tsx` | Selection mode state (`Set<string>`), bulk action handlers, toolbar toggle, Escape key listener |
| `src/components/board/task-card-live.tsx` | `selectionMode`, `selected`, `onToggleSelect` props; checkbox display; DnD disabled in selection mode |

## Technical Notes

- Selection state is a `Set<string>` of task IDs managed in `kanban-board-live.tsx`
- Bulk operations use Supabase `.in('id', taskIds)` for efficient batch updates
- Soft-delete follows the existing pattern: `deleted_at = now()` (restorable from trash)
- Optimistic UI updates with rollback on error
- The `BulkActionBar` uses `AlertDialog` for the destructive delete confirmation

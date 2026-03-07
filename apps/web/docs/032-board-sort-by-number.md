# 032 — Board Sorting & Auto-Numbering (LP-032)

## Overview
Three changes to how the board organizes tickets:
1. Column sorting: backlog ascending, active columns descending
2. Auto-numbering: new tickets get the next prefix number automatically
3. Priority badges remain visual-only (no longer affect sort)

## Why
- Priority sorting scrambled planning order in backlog
- Numberless tickets broke scanning and sort consistency
- In active columns (In Progress, Review, Done), you want to see latest work on top

## What Changed

### `kanban-board-live.tsx` — Column Sorting
- Parses ticket number from title via regex (`/^[A-Z]+-(\d{3})/`)
- Backlog: ascending by ticket number (MY-011 → MY-012 → MY-022 → MY-023)
- In Progress / Review / Done: descending by ticket number (MY-024 → MY-021 → MY-020 → ...)
- Tasks without a prefix get `9999` (sorted to bottom of backlog, top of done)
- Removed `PRIORITY_WEIGHT` map entirely
- Same logic applied to static `kanban-board.tsx`

**Why not sort by `position`?** The `position` field is unreliable — many tasks have `position=0` from being moved between columns without proper re-indexing. Parsing the actual ticket number from the title is the source of truth.

### `queries.ts` — Auto-Numbering in `createTask`
- Detects project prefix from existing tasks (most common `XX-` pattern)
- Finds the highest existing number for that prefix
- If user's title doesn't start with a prefix, prepends `XX-NNN: ` automatically
- Examples:
  - Existing: MY-024 → User types "Fix login" → Saved as "MY-025: Fix login"
  - User types "MY-026: Custom title" → Saved as-is (no double-prefix)
  - No existing tasks → No prefix detected, title saved as-is
- Numbers zero-padded to 3 digits (001, 002, ... 999)

## Edge Cases
- **No existing tasks**: No prefix detected, title saved as-is
- **Mixed prefixes**: Uses the most common prefix
- **User includes prefix**: Detected by regex, no auto-numbering applied
- **Position assignment**: Still max+1 for the column (DnD reorder persists)

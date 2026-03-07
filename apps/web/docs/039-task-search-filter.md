# 039 — Task Search & Filter (LP-039)

## Overview
Search bar and priority filter on the board toolbar. Filters tasks across all columns in real-time.

## What Changed

### New: `task-search.tsx`
- Search input with / keyboard shortcut to focus
- Priority filter dropdown (multi-select checkboxes)
- Clear button when filters active
- `filterTasks()` utility: matches title + description, filters by priority

### Updated: `kanban-board-live.tsx`
- Filter state managed in board
- `filteredTasks` memo applies filters before column grouping
- TaskSearch component added to toolbar
- Column counts update to reflect filtered results

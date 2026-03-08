# LP-050: Auto-Number Tickets from Project Prefix

## What
Projects can now have a `ticket_prefix` (e.g., "LP", "SB", "WM") that auto-numbers new tasks. No seed task required — the first task on a new project will be `PREFIX-001`.

## How It Works
1. Set the prefix in **Project Settings → Ticket Prefix**
2. Create a task with any title (e.g., "Fix login bug")
3. Task is automatically titled `LP-001: Fix login bug`
4. Next task gets `LP-002`, etc.

## Fallback
If no `ticket_prefix` is set on the project, the system falls back to the old behavior: detecting the prefix pattern from existing task titles.

## Database
- Column: `projects.ticket_prefix` (TEXT, nullable)
- Constraint: `ticket_prefix_format` — must be 2-5 uppercase letters (`^[A-Z]{2,5}$`)
- Migration: `20260307000006_add_ticket_prefix.sql`

## UI
- Project Settings page: new "Ticket Prefix" input
- Auto-uppercases, restricts to A-Z, max 5 chars
- Preview text shows expected numbering pattern

## Validation
- Client-side: regex filter on input, 2-5 uppercase letters
- Server-side: PostgreSQL CHECK constraint
- Empty/invalid prefix saves as NULL (auto-numbering disabled)

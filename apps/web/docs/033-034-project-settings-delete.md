# 033/034 — Project Settings, Delete & Archive (LP-033, LP-034)

## Overview
Project management: settings page, delete with double-confirm, archive/restore, 3-dot menu on project cards.

## What Changed

### New: Project Settings Page
- Route: `/projects/[id]/settings`
- Server component verifies ownership before rendering
- General section: edit name/description with Save button
- Danger zone (red border): Archive + Delete buttons
- Delete requires typing project name to confirm

### New: Project List Enhancements
- 3-dot menu on owned project cards: Settings, Delete
- Archived projects section at bottom (collapsed by default)
- Chevron toggle to show/hide archived
- Restore button on archived cards

### Updated: Queries
- `archiveProject(supabase, id)` — sets `archived = true`
- `restoreProject(supabase, id)` — sets `archived = false`
- `getArchivedProjects(supabase)` — fetches archived projects

### Updated: Board Page
- Settings gear icon in header (next to ShareDialog), owner only

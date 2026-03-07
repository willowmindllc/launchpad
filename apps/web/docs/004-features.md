# Features

## Kanban Board (LP-005, LP-011)
- **What:** Drag-and-drop task board with 4 columns: Backlog, In Progress, Review, Done
- **DnD library:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Supports:** Cross-column moves + within-column reordering
- **Files:** `src/components/board/kanban-board-live.tsx`, `src/components/board/task-card.tsx`

## Task Detail Sheet (LP-012)
- **What:** Click a task card → slide-out sheet with full details
- **Editable fields:** Title, description, status, priority, due date
- **Files:** `src/components/board/task-detail-sheet.tsx`

## Export to CSV (LP-003)
- **Added:** Feb 22, 2026
- **What:** Download all project tasks as a CSV file
- **How:** Client-side generation — no API call needed
- **Columns:** Title, Description, Status, Priority, Due Date, Created, Updated
- **Filename:** `{project-name}-tasks-{YYYY-MM-DD}.csv`
- **Details:** UTF-8 BOM for Excel compatibility, proper escaping of commas/quotes
- **Files:** `src/lib/export-csv.ts`, button in `src/components/board/kanban-board-live.tsx`

## Dark Mode (LP-009)
- **What:** Dark-first theme using Tailwind CSS + CSS custom properties
- **How:** `dark` class on root, all components use `bg-background`, `text-foreground`, etc.
- **Files:** `src/app/globals.css` (CSS variables for light/dark)

## Mobile Responsive (LP-023)
- **Added:** Feb 22, 2026
- **What:** Collapsible sidebar on mobile with hamburger menu
- **How:**
  - Mobile (< md): Sidebar hidden, sticky top bar with hamburger icon
  - Click hamburger → sidebar slides in as overlay with backdrop
  - Click backdrop or nav item → sidebar closes
  - Desktop (>= md): Sidebar always visible, no hamburger
- **Kanban:** Horizontal scroll with min-width columns, buttons wrap on small screens
- **Files:** `src/app/(dashboard)/layout.tsx`, `src/components/layout/sidebar.tsx`

## Custom Domain (LP-001)
- **Added:** Feb 22, 2026
- **URL:** `https://launchpad-your-github-username.vercel.app`
- **Previous:** `launchpad-kohl-sigma.vercel.app` (auto-generated)
- **Note:** Supabase auth redirect URLs must match the production domain

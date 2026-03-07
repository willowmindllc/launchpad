# LaunchPad — Architecture & Tech Stack

> Lightweight workflow tracking for solo builders and micro-teams.

## Tech Stack Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Next.js 16 (App Router) + TypeScript + Tailwind    │
│  shadcn/ui components (New York style, Zinc palette)│
│  @dnd-kit (drag-and-drop)                           │
├─────────────────────────────────────────────────────┤
│                    HOSTING                           │
│  Vercel (auto-deploy from main branch)              │
│  Edge Middleware for auth session management         │
├─────────────────────────────────────────────────────┤
│                    BACKEND                           │
│  Supabase (BaaS)                                    │
│  ├── PostgreSQL (database)                          │
│  ├── Auth (email/password + GitHub OAuth)            │
│  ├── Row Level Security (RLS)                        │
│  └── PostgREST (auto-generated REST API)            │
└─────────────────────────────────────────────────────┘
```

## E2E Request Flow

### 1. User Opens the App

```
Browser → Vercel CDN → Next.js Middleware
                            │
                     Check auth cookie
                            │
                    ┌───────┴───────┐
                    │               │
              Has session      No session
                    │               │
              Serve page      Redirect to
              (SSR/SSG)        /login
```

### 2. Authentication (GitHub OAuth)

```
1. User clicks "Continue with GitHub"
2. Client calls supabase.auth.signInWithOAuth({ provider: 'github' })
3. Supabase redirects → GitHub OAuth consent screen
4. User authorizes → GitHub redirects to Supabase callback
5. Supabase exchanges code for tokens, creates user in auth.users
6. Database trigger (handle_new_user) auto-creates profile in public.profiles
7. Supabase redirects → /auth/callback in our app
8. /auth/callback exchanges code for session, sets cookies
9. User lands on /projects (authenticated)
```

### 3. Loading the Projects Page (Server Component)

```
Browser request → Vercel → Next.js Server Component
                                    │
                           createClient() (server)
                           reads auth cookie
                                    │
                           supabase.auth.getUser()
                           (validates JWT)
                                    │
                           getProjects(supabase)
                           SELECT *, tasks(count) FROM projects
                                    │
                           PostgreSQL applies RLS:
                           can_access_project(id, auth.uid())
                                    │
                           Returns only user's projects
                                    │
                           Server renders HTML + streams to client
```

### 4. Creating a Task (Client Component)

```
User clicks "+" → CreateTaskDialog opens
User fills form → clicks "Create Task"
                        │
               Client-side Supabase client
               (uses cookie-based auth)
                        │
               createTask(supabase, { title, status, priority, project_id })
                        │
               POST /rest/v1/tasks → Supabase PostgREST
                        │
               RLS check: can_access_project(project_id, auth.uid())
                        │
               Insert succeeds → returns new task
                        │
               Client calls router.refresh()
               Server re-renders with new data
```

### 5. Drag-and-Drop Task Movement

```
User drags task card → @dnd-kit DndContext
                            │
                    onDragEnd fires
                            │
               Optimistic update (setState)
               UI instantly moves card
                            │
               moveTask(supabase, taskId, newStatus, newPosition)
               PATCH /rest/v1/tasks?id=eq.xxx
                            │
               On success: router.refresh() (sync server state)
               On failure: revert optimistic update
```

### 6. Editing a Task (Side Sheet)

```
User clicks task card → TaskDetailSheet opens (right side)
                            │
               Local state initialized from task props
                            │
               User edits field → onChange updates local state
               User blurs field → onBlur triggers save
                            │
               updateTask(supabase, taskId, { [field]: value })
               PATCH /rest/v1/tasks?id=eq.xxx
                            │
               onUpdated() → router.refresh()
```

## Database Schema

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  auth.users  │     │    profiles       │     │   projects   │
│  (Supabase)  │────▶│  id (FK→users)   │◀────│  owner_id    │
│              │     │  username         │     │  name        │
│              │     │  full_name        │     │  description │
│              │     │  avatar_url       │     │  archived    │
└──────────────┘     └──────────────────┘     └──────┬───────┘
                              │                       │
                              │                       │
                     ┌────────┴────────┐     ┌────────┴────────┐
                     │ project_members │     │     tasks       │
                     │ project_id (FK) │     │  project_id (FK)│
                     │ user_id (FK)    │     │  title          │
                     │ role            │     │  status (enum)  │
                     └─────────────────┘     │  priority (enum)│
                                             │  assignee_id    │
                                             │  position       │
                                             │  due_date       │
                                             └─────────────────┘
```

### Enums

| Type | Values |
|------|--------|
| `task_status` | `backlog`, `in_progress`, `review`, `done` |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `member_role` | `owner`, `admin`, `member`, `viewer` |

## Row Level Security (RLS)

RLS ensures users only see their own data. Every query goes through PostgreSQL policies.

### The Circular Recursion Problem

The naive approach causes infinite recursion:
- Projects policy checks `project_members` → project_members policy checks `projects` → ∞

**Solution:** Security definer functions that bypass RLS for internal checks:

```sql
-- Bypasses RLS when called from policies
CREATE FUNCTION can_access_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = p_user_id)
      OR EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id);
$$ LANGUAGE sql SECURITY DEFINER;
```

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Everyone | Anyone (for trigger) | Own only | — |
| projects | Owner or member | Owner | Owner | Owner |
| tasks | Project access | Project access | Project access | Project access |
| project_members | Everyone | Project owner | — | Project owner |

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (dark mode, fonts, metadata)
│   ├── page.tsx                # Root redirect (→ /projects or /login)
│   ├── (auth)/                 # Auth route group (no sidebar)
│   │   ├── login/page.tsx      # Login page
│   │   └── signup/page.tsx     # Signup page
│   ├── (dashboard)/            # Dashboard route group (with sidebar)
│   │   ├── layout.tsx          # Sidebar + main layout
│   │   ├── dashboard/page.tsx  # Stats overview
│   │   └── projects/
│   │       ├── page.tsx        # Project list (SSR)
│   │       └── [id]/page.tsx   # Kanban board (SSR + client hydration)
│   └── auth/callback/route.ts  # OAuth callback handler
├── components/
│   ├── board/                  # Kanban board components
│   │   ├── kanban-board-live.tsx    # DndContext + columns + drag overlay
│   │   ├── task-card-live.tsx       # Draggable task card
│   │   ├── task-detail-sheet.tsx    # Side sheet for editing
│   │   └── create-task-dialog-live.tsx
│   ├── layout/
│   │   ├── sidebar.tsx         # Navigation sidebar
│   │   └── header.tsx          # Page header
│   ├── projects/
│   │   └── project-list.tsx    # Project grid + create dialog
│   └── ui/                     # shadcn/ui primitives
├── lib/supabase/
│   ├── client.ts               # Browser Supabase client
│   ├── server.ts               # Server Supabase client (cookie-based)
│   ├── middleware.ts            # Auth session refresh
│   └── queries.ts              # All database queries
└── types/
    └── database.ts             # TypeScript types + enums
```

## Key Architecture Decisions

### Server Components + Client Components Split

- **Server Components** (pages): Fetch data on the server, no client JS for initial render
- **Client Components** (board, forms): Interactive UI with optimistic updates
- Pattern: Server fetches → passes data as props → Client hydrates for interactivity

### Optimistic Updates

All mutations (create, move, delete tasks) update the UI immediately before the server responds:
1. Update local state (instant feedback)
2. Send request to Supabase
3. On success: `router.refresh()` to sync server state
4. On failure: revert local state

### Cookie-Based Auth (SSR-Compatible)

Supabase SSR uses cookies instead of localStorage for auth tokens:
- Works with Server Components (cookies available on server)
- Middleware refreshes expired tokens automatically
- No flash of unauthenticated content

### Why No Real-time (Yet)

Supabase supports real-time subscriptions, but for a solo-user tool:
- `router.refresh()` after mutations is sufficient
- Avoids WebSocket connection overhead
- Can be added later for multi-user collaboration

## Deployment

```
GitHub (main) → Vercel (auto-deploy) → Production
                    │
              Environment vars:
              NEXT_PUBLIC_SUPABASE_URL
              NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Build: `next build` (Turbopack)
Runtime: Vercel Serverless Functions (Node.js)
CDN: Vercel Edge Network (static assets)

## Development

```bash
npm install          # Install deps
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm test             # Run tests (Vitest)
```

# 005 — Chat-to-Board (LP-017 / LP-018 / LP-019)

## What

An AI-powered chat panel that lets users describe features in natural language and get actionable tasks added directly to their Kanban board. Also supports natural language board management ("mark X as done", "move Y to review").

## Why

Typing tasks one-by-one is slow. Most people think in paragraphs, not ticket fields. Chat-to-Board bridges that gap — describe what you're building, and the AI breaks it into tasks with priorities. It's LaunchPad's key differentiator.

## How It Works

### Frontend — `src/components/board/chat-to-board.tsx`

- Floating chat bubble (bottom-right) opens a slide-up panel
- **Mobile**: full-width panel | **Desktop**: 420px fixed-width panel
- Sends conversation history + project context to `/api/ai/chat`
- AI responses can include:
  - **Task suggestions** — rendered as cards with "Add" / "Add All" buttons
  - **Task actions** — status updates or deletions executed against Supabase
- Added tasks get inserted via Supabase client with the current user's project ID

### Backend — `src/app/api/ai/chat/route.ts`

- Authenticated endpoint (requires Supabase session)
- Fetches user's BYOK settings (provider + API key) from `profiles` table
- Falls back to server-side `GROQ_API_KEY` if no BYOK configured
- Sends structured system prompt that forces JSON output:
  ```json
  {
    "message": "Conversational response",
    "tasks": [{ "title", "description", "priority", "status" }],
    "actions": [{ "type": "update_status|delete_task", "taskTitle", "status?" }]
  }
  ```
- Multi-provider support: Groq, OpenAI, Anthropic, Google Gemini (same router as suggest-tasks)

### Supported Actions (LP-019)

| Command | Action |
|---|---|
| "mark X as done" | `update_status` → `done` |
| "move X to review" | `update_status` → `review` |
| "delete X" | `delete_task` |

Task matching is fuzzy — the AI extracts the closest task title from the user's phrasing.

## Architecture

```
User types message
  → chat-to-board.tsx (client)
    → POST /api/ai/chat
      → reads BYOK from profiles table
      → calls AI provider (Groq/OpenAI/Anthropic/Gemini)
      → returns { message, tasks[], actions[] }
    → renders response + task cards
    → "Add" inserts task into Supabase `tasks` table
    → "Add All" bulk-inserts all suggested tasks
    → actions execute status updates via Supabase client
  → onTasksAdded() refreshes kanban board
```

## Key Design Decisions

- **JSON-only system prompt**: AI must return valid JSON (no markdown fences). This avoids parsing issues and keeps the UI predictable.
- **Context-aware**: Current board tasks are sent to the AI so it can reference existing work for actions.
- **No streaming**: Full response returned at once. Simpler implementation, and task cards need the complete response to render.
- **Conversation memory**: Full chat history is sent each request (within the panel session). Closing the panel resets the conversation.

## Data Persistence

**Tasks** persist — when you click "Add" or "Add All", tasks are inserted into the Supabase `tasks` table immediately. They survive page refreshes, device switches, everything.

**Chat conversations do not persist (yet).** The message history lives entirely in React state (`useState<ChatMessage[]>`). The lifecycle:

1. **Open panel** → empty chat, fresh `messages` array in memory
2. **Send message** → appends to local state → sends full conversation history to `/api/ai/chat`
3. **AI responds** → tasks/actions rendered inline → "Add" writes task to Supabase `tasks` table
4. **Close panel or navigate away** → chat history is lost, but added tasks are already on the board

There is currently no `chat_messages` table, no localStorage fallback, and no way to review past conversations.

### Planned: Persistent Chat History

- `chat_sessions` table (id, project_id, user_id, title, created_at)
- `chat_messages` table (id, session_id, role, content, tasks_json, actions_json, created_at)
- RLS policies scoped to the owning user
- Sidebar in chat panel to switch between past conversations

## Files

| File | Purpose |
|---|---|
| `src/components/board/chat-to-board.tsx` | Chat panel UI + task/action handling |
| `src/app/api/ai/chat/route.ts` | AI endpoint with multi-provider router |
| `docs/005-chat-to-board.md` | This doc |

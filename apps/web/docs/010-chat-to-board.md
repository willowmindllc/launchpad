# 010 — Chat-to-Board (LP-017/018)

## What

Natural language chat interface that creates, moves, updates, deletes, and lists tasks on the Kanban board through conversation.

## Why

Typing into a chat is faster than clicking through UI forms. This is LaunchPad's differentiator — manage your entire board by just talking to it.

## How It Works

```
User message → /api/ai/chat-to-board → AI parses intent → structured JSON actions → execute against Supabase → return results with inline task cards
```

### Supported Actions

| Action | Example | What happens |
|--------|---------|--------------|
| **Create** | "Add a task for dark mode with high priority" | Creates task in Backlog |
| **Move** | "Mark auth task as done" | Fuzzy-matches task, moves to Done column |
| **Update** | "Change priority of login task to urgent" | Updates task fields |
| **Delete** | "Remove the old test task" | Soft-deletes the task |
| **List** | "Show me all in-progress tasks" | Returns filtered task cards |

### AI Pipeline

1. User sends message in chat
2. Frontend POSTs to `/api/ai/chat-to-board` with message + conversation history
3. System prompt includes current board state (task titles, statuses, priorities) for context
4. AI returns structured JSON: `{ message, actions[] }`
5. Each action is executed against Supabase (create/update/delete/select)
6. Results returned with inline task card previews

### Structured Output Format

```json
{
  "message": "Created 2 tasks in your backlog!",
  "actions": [
    {
      "type": "create",
      "title": "Implement dark mode toggle",
      "description": "Add theme switcher in settings",
      "priority": "high",
      "status": "backlog"
    }
  ]
}
```

## Architecture

### API Endpoint

`POST /api/ai/chat-to-board`

**Request:**
- `message` — user's chat message
- `messages` — conversation history for context
- `projectId` — which project board to operate on

**Response:**
- `message` — AI's conversational reply
- `actions_executed[]` — results of each action (success/error, task data)

### Components

- `src/app/api/ai/chat-to-board/route.ts` — API endpoint, action execution
- `src/components/board/chat-to-board.tsx` — Chat UI with inline task cards

### UI Elements

- **InlineTaskCard** — mini task card shown in chat (title, priority badge, status badge)
- **ActionResult** — success/error indicator per action with icon
- Chat history with session persistence (uses existing chat_sessions/chat_messages tables)

## AI Provider Support

Uses the existing multi-provider setup (BYOK Phase 1):
- **Default:** Groq (Llama 3.3 70B) — free
- **BYOK:** OpenAI, Anthropic, Gemini via user's API key in Settings

## Task Matching

For move/update/delete actions, the AI returns a `taskTitle` string. The backend does a case-insensitive fuzzy match (`ILIKE %title%`) against existing tasks in the project to find the target task.

## Database

No new tables — uses existing:
- `tasks` — CRUD operations
- `chat_sessions` / `chat_messages` — conversation persistence

## Future

- Voice-to-board (speech → text → task)
- Batch operations ("create 5 tasks for the auth epic")
- Smart suggestions based on board state
- Undo last action

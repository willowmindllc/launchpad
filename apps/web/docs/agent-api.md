# LaunchPad Agent API

The Agent API lets AI agents (Codex, Claude Code, Mahadev, etc.) programmatically manage tasks on LaunchPad project boards.

## Authentication

All agent API endpoints use Bearer token authentication.

```
Authorization: Bearer lp_<token>
```

Generate tokens from **Project Settings → Agent API Tokens** in the LaunchPad UI. Tokens are shown once at creation — store them securely.

## Rate Limits

- **60 requests per minute** per token
- Rate limit headers included in responses:
  - `Retry-After` — seconds until the limit resets
  - `X-RateLimit-Reset` — Unix timestamp of the reset

## Permissions

Tokens can have one or more permissions:

| Permission | Access |
|-----------|--------|
| `read` | List and view tasks |
| `write` | Create tasks, update tasks, add comments |
| `admin` | Full access (includes read + write) |

## Endpoints

### List Tasks

```
GET /api/agent/tasks
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status: `backlog`, `in_progress`, `review`, `done` |
| `priority` | string | Filter by priority: `low`, `medium`, `high`, `urgent` |
| `search` | string | Search by title (case-insensitive) |
| `limit` | number | Max results (default: 50, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**

```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "LP-001: Implement login",
      "description": "Add OAuth login flow",
      "status": "in_progress",
      "priority": "high",
      "project_id": "uuid",
      "assignee_id": "uuid",
      "position": 1,
      "created_at": "2026-03-09T00:00:00Z",
      "updated_at": "2026-03-09T00:00:00Z"
    }
  ],
  "total": 42
}
```

### Create Task

```
POST /api/agent/tasks
```

**Permission:** `write`

**Body:**

```json
{
  "title": "Implement feature X",
  "description": "Details about the feature",
  "status": "backlog",
  "priority": "high",
  "assignee_id": "user-uuid"
}
```

Only `title` is required. Defaults: `status=backlog`, `priority=medium`.

If the project has a ticket prefix, the task is auto-numbered (e.g., `LP-042: Implement feature X`).

**Response:** `201 Created`

```json
{
  "task": { ... }
}
```

### Update Task

```
PATCH /api/agent/tasks/:id
```

**Permission:** `write`

**Body (all fields optional):**

```json
{
  "status": "done",
  "priority": "low",
  "title": "Updated title",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "task": { ... }
}
```

### Add Comment

```
POST /api/agent/tasks/:id/comments
```

**Permission:** `write`

**Body:**

```json
{
  "content": "Build completed successfully. All tests passing."
}
```

**Response:** `201 Created`

```json
{
  "comment": {
    "id": "uuid",
    "task_id": "uuid",
    "user_id": "uuid",
    "content": "Build completed successfully. All tests passing.",
    "created_at": "2026-03-09T00:00:00Z"
  }
}
```

## Token Management (Authenticated Users)

These endpoints use standard session authentication (not agent tokens).

### Generate Token

```
POST /api/agent/tokens
```

**Body:**

```json
{
  "project_id": "uuid",
  "name": "Mahadev Builder",
  "permissions": ["read", "write"]
}
```

**Response:** `201 Created`

```json
{
  "token": "lp_a1b2c3d4...",
  "id": "uuid"
}
```

The token is only returned once. Store it securely.

### List Tokens

```
GET /api/agent/tokens?project_id=uuid
```

**Response:**

```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "Mahadev Builder",
      "permissions": ["read", "write"],
      "created_at": "2026-03-09T00:00:00Z",
      "last_used_at": "2026-03-09T12:00:00Z",
      "revoked_at": null
    }
  ]
}
```

### Revoke Token

```
DELETE /api/agent/tokens/:id
```

**Response:**

```json
{
  "success": true
}
```

## Examples

### Using with curl

```bash
# Set your token
TOKEN="lp_your_token_here"

# List tasks
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.com/api/agent/tasks

# Create a task
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "priority": "urgent"}' \
  https://your-app.com/api/agent/tasks

# Update task status to done
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}' \
  https://your-app.com/api/agent/tasks/TASK_ID

# Add a comment
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Deployed to staging"}' \
  https://your-app.com/api/agent/tasks/TASK_ID/comments
```

### Using with Mahadev / OpenClaw

```bash
# In your .claude or agent config, set the LaunchPad token:
export LAUNCHPAD_TOKEN="lp_your_token_here"
export LAUNCHPAD_URL="https://your-app.com"

# Agents can then use the API to:
# 1. Fetch assigned tasks
# 2. Update task status as work progresses
# 3. Add comments with build/deploy results
# 4. Create new tasks for discovered issues
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of the error"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — invalid or revoked token |
| 403 | Forbidden — insufficient permissions or cross-project access |
| 404 | Not found — task doesn't exist |
| 429 | Rate limited — too many requests |
| 500 | Server error |

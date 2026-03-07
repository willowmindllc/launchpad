# AI Features

## AI Task Suggestions (LP-013)
- **Added:** Feb 21, 2026
- **What:** Click "Generate Tasks with AI" on any project board → AI suggests 5-8 actionable tasks based on project name/description.
- **How it works:**
  1. User clicks button → opens dialog
  2. Frontend calls `POST /api/ai/suggest-tasks` with project name + description
  3. Backend sends prompt to AI provider requesting structured task suggestions
  4. Returns JSON array of tasks with title, description, priority
  5. User reviews, edits, removes suggestions → clicks "Add Tasks" to create them
- **Provider:** Groq (Llama 3.3 70B) — free tier, fast inference
- **Fallback:** If no API key or API error → returns mock/static suggestions
- **Files:** `src/app/api/ai/suggest-tasks/route.ts`, `src/components/board/ai-suggest-dialog.tsx`

## BYOK — Bring Your Own Key (LP-014, LP-015, LP-016)
- **Added:** Feb 22, 2026
- **What:** Users can plug in their own AI API key instead of using the server default.
- **Why:** Avoids rate limits on shared key, lets users choose their preferred provider/model.
- **Supported providers:**
  - Anthropic (Claude Sonnet) — paid
  - Google Gemini (2.0 Flash) — free tier (requires billing enabled)
  - OpenAI (GPT-4o-mini) — paid
  - Groq (Llama 3.3 70B) — free tier
- **How it works:**
  1. User goes to Settings → AI Settings
  2. Selects provider, pastes API key, saves
  3. Key stored in `profiles.ai_api_key`, provider in `profiles.ai_provider`
  4. When AI suggestions are requested, backend checks user's key first
  5. If no user key → falls back to server `GROQ_API_KEY` env var
- **Database:**
  - Columns: `profiles.ai_provider` (text), `profiles.ai_api_key` (text)
  - Migration: `supabase/migrations/20260222_add_ai_settings.sql`
  - Security: `get_my_ai_settings()` function (SECURITY DEFINER) — only returns own user's key
- **Files:**
  - Settings page: `src/app/(dashboard)/settings/page.tsx`
  - Multi-provider router: `src/app/api/ai/suggest-tasks/route.ts` (PROVIDER_CONFIG map)
  - Types: `src/types/database.ts` (AIProvider type, AI_PROVIDER_LABELS)

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `GROQ_API_KEY` | Vercel env (production) + `.env.local` (dev) | Server default AI key |
| `GEMINI_API_KEY` | Vercel env (unused, was previous default) | Deprecated — switched to Groq |

## Provider API Formats

Each provider has a different API format. The `PROVIDER_CONFIG` map in the suggest-tasks route handles:
- **Anthropic:** `/v1/messages` with `x-api-key` header + `anthropic-version` header
- **Google Gemini:** `/v1beta/models/gemini-2.0-flash:generateContent` with API key as query param
- **OpenAI/Groq:** OpenAI-compatible `/v1/chat/completions` with `Authorization: Bearer` header

## Future: Chat-to-Board (LP-017, LP-018)
- Chat interface where users describe their project in natural language
- AI parses conversation → auto-creates project + tasks
- Follow-up refinement: "Add a payment task", "Mark auth as done"
- See tickets LP-017 (UI), LP-018 (backend), LP-019 (chat task actions)

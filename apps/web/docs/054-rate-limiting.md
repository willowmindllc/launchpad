# LP-054: Rate Limiting on API Routes

## What
Sliding window rate limiter applied to all `/api/*` routes via Next.js middleware.

## Rate Limit Tiers

| Route Prefix | Limit | Window | Reason |
|-------------|-------|--------|--------|
| `/api/ai/` | 20 req/min | 60s | AI calls are expensive |
| `/api/auth/` | 15 req/min | 60s | Prevent brute-force |
| `/api/projects/` | 30 req/min | 60s | Invite abuse protection |
| `/api/webhooks/` | 100 req/min | 60s | GitHub webhook bursts |

## Implementation
- **`src/lib/rate-limit.ts`** — In-memory sliding window rate limiter
- **`src/middleware.ts`** — Applies rate limits before processing any API request
- Client IP extracted from `x-forwarded-for` (Vercel sets this)

## Response on Limit
```json
HTTP 429 Too Many Requests
Retry-After: <seconds>
X-RateLimit-Reset: <unix timestamp>

{"error": "Too many requests. Please try again later."}
```

## Upgrade Path
Current implementation uses in-memory store (resets on cold start). For production with multiple instances:
1. Create free Upstash Redis account
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
3. Swap `rate-limit.ts` to use `@upstash/ratelimit` (already installed)

## Why In-Memory First
- Zero external dependencies to get started
- Provides burst protection within a single serverless instance
- Vercel functions have warm instances for ~5 min, so limits do apply
- Upgrade to Redis when traffic justifies it

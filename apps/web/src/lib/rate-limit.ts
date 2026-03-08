import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple sliding window rate limiter.
 * Uses in-memory store by default. Swap to Upstash Redis for production:
 *   Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.
 */

interface RateLimitConfig {
  /** Max requests in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

// In-memory store (resets on cold start — fine for burst protection)
const store = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return // cleanup every 60s max
  lastCleanup = now
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key)
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const ip = getClientIp(req)
  const key = `${req.nextUrl.pathname}:${ip}`
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  cleanup()

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: config.limit - 1, reset: now + windowMs }
  }

  entry.count++
  if (entry.count > config.limit) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }

  return { success: true, remaining: config.limit - entry.count, reset: entry.resetAt }
}

export function rateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
      },
    }
  )
}

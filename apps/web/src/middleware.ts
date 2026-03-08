import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Rate limit tiers by route sensitivity.
 * AI routes are expensive → tighter limits.
 * Auth/invite routes are abuse targets → moderate limits.
 * Webhooks need headroom → generous limits.
 */
const RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  '/api/ai/':       { limit: 20, windowSeconds: 60 },   // 20 req/min (AI is costly)
  '/api/projects/':  { limit: 30, windowSeconds: 60 },   // 30 req/min (invites, etc.)
  '/api/webhooks/':  { limit: 100, windowSeconds: 60 },  // 100 req/min (GitHub webhooks)
  '/api/auth/':      { limit: 15, windowSeconds: 60 },   // 15 req/min (auth flows)
}

function getRateLimitConfig(pathname: string) {
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) return config
  }
  return null // no rate limit for non-API routes
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    const config = getRateLimitConfig(pathname)
    if (config) {
      const result = await rateLimit(request, config)
      if (!result.success) {
        return rateLimitResponse(result.reset)
      }
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

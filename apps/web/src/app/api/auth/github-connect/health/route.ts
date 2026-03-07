import { NextResponse, type NextRequest } from 'next/server'

/**
 * Health-check endpoint for GitHub OAuth configuration.
 * Validates that environment variables are set and the OAuth App
 * client ID is recognized by GitHub.
 *
 * GET /api/auth/github-connect/health
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim()
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim()
  const origin = request.nextUrl.origin

  const callbackUrl = `${origin}/api/auth/github-connect/callback`
  const clientIdFormatOk = !!clientId && /^[A-Za-z0-9_-]{10,40}$/.test(clientId)

  const checks: Record<string, { ok: boolean; detail?: string }> = {
    GITHUB_APP_CLIENT_ID: {
      ok: !!clientId,
      detail: clientId ? clientId : 'NOT SET',
    },
    client_id_format: {
      ok: clientIdFormatOk,
      detail: clientIdFormatOk
        ? 'Format looks valid'
        : clientId
          ? `Unexpected format (length=${clientId.length})`
          : 'N/A — client ID not set',
    },
    GITHUB_APP_CLIENT_SECRET: {
      ok: !!clientSecret,
      detail: clientSecret ? `SET (length=${clientSecret.length})` : 'NOT SET',
    },
    callback_url: {
      ok: true,
      detail: callbackUrl,
    },
  }

  // Verify the client ID is valid by hitting GitHub's authorize endpoint with a HEAD-like GET
  if (clientId) {
    try {
      const params = new URLSearchParams({
        client_id: clientId,
      })
      const res = await fetch(
        `https://github.com/login/oauth/authorize?${params}`,
        { method: 'GET', redirect: 'manual' }
      )
      // GitHub returns 302 for valid client IDs, 404 for invalid ones
      const isValid = res.status === 302 || res.status === 200
      checks.oauth_app_valid = {
        ok: isValid,
        detail: isValid
          ? 'GitHub recognized the client ID'
          : `GitHub returned ${res.status} — the OAuth App may be deleted or the client ID is wrong`,
      }
    } catch (err) {
      checks.oauth_app_valid = {
        ok: false,
        detail: `Network error checking GitHub: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    { healthy: allOk, checks },
    { status: allOk ? 200 : 503 }
  )
}

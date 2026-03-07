import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // Debug: log the full callback URL (mask the code for safety)
  console.log('[github-connect/callback] Received callback', {
    fullUrl: url.toString().replace(/code=[^&]+/, 'code=REDACTED'),
    hasCode: !!code,
    hasState: !!stateParam,
    hasError: !!error,
  })

  // GitHub redirects here with ?error=... when the user denies or something goes wrong
  if (error) {
    console.error('[github-connect/callback] GitHub returned error:', {
      error,
      errorDescription,
    })
    const errorParam =
      error === 'access_denied'
        ? 'github_access_denied'
        : 'github_oauth_error'
    return NextResponse.redirect(
      new URL(`/settings?error=${errorParam}`, url.origin)
    )
  }

  if (!code) {
    console.error('[github-connect/callback] No code in callback URL')
    return NextResponse.redirect(
      new URL('/settings?error=github_no_code', url.origin)
    )
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim()
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    console.error('[github-connect/callback] Missing GitHub OAuth env vars', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    })
    return NextResponse.redirect(
      new URL('/settings?error=github_misconfigured', url.origin)
    )
  }

  // Validate state parameter (contains userId + timestamp)
  let statePayload: { userId?: string; ts?: number } | null = null
  if (stateParam) {
    try {
      statePayload = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    } catch {
      console.error('[github-connect/callback] Failed to decode state parameter')
    }
  }

  if (!statePayload?.userId) {
    console.error('[github-connect/callback] Missing or invalid state parameter')
    return NextResponse.redirect(
      new URL('/settings?error=github_oauth_error', url.origin)
    )
  }

  // Build redirect_uri to match what was sent in the authorize step
  const redirectUri = `${url.origin}/api/auth/github-connect/callback`

  // Exchange code for access token
  let tokenData: Record<string, string>
  try {
    console.log('[github-connect/callback] Exchanging code for token', {
      clientId,
      redirectUri,
    })

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      }
    )

    if (!tokenRes.ok) {
      console.error('[github-connect/callback] Token exchange HTTP error:', {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
      })
      return NextResponse.redirect(
        new URL('/settings?error=github_token_failed', url.origin)
      )
    }

    tokenData = await tokenRes.json()
  } catch (err) {
    console.error('[github-connect/callback] Token exchange network error:', err)
    return NextResponse.redirect(
      new URL('/settings?error=github_token_failed', url.origin)
    )
  }

  // GitHub returns 200 with error field for invalid codes/credentials
  if (tokenData.error) {
    console.error('[github-connect/callback] Token exchange returned error:', {
      error: tokenData.error,
      description: tokenData.error_description,
    })
    const errorParam =
      tokenData.error === 'bad_verification_code'
        ? 'github_code_expired'
        : 'github_token_failed'
    return NextResponse.redirect(
      new URL(`/settings?error=${errorParam}`, url.origin)
    )
  }

  const accessToken = tokenData.access_token
  if (!accessToken) {
    console.error('[github-connect/callback] No access_token in response')
    return NextResponse.redirect(
      new URL('/settings?error=github_no_token', url.origin)
    )
  }

  // Fetch GitHub user info
  let githubUser: { login: string; avatar_url?: string }
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    })

    if (!userRes.ok) {
      console.error('[github-connect/callback] GitHub user API error:', {
        status: userRes.status,
      })
      return NextResponse.redirect(
        new URL('/settings?error=github_user_failed', url.origin)
      )
    }

    githubUser = await userRes.json()
  } catch (err) {
    console.error('[github-connect/callback] GitHub user API network error:', err)
    return NextResponse.redirect(
      new URL('/settings?error=github_user_failed', url.origin)
    )
  }

  // Store connection in database
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  const { error: dbError } = await supabase
    .from('github_connections')
    .upsert(
      {
        user_id: user.id,
        access_token: accessToken,
        github_username: githubUser.login,
        github_avatar_url: githubUser.avatar_url || null,
      },
      { onConflict: 'user_id' }
    )

  if (dbError) {
    console.error('[github-connect/callback] Failed to store connection:', dbError)
    return NextResponse.redirect(
      new URL('/settings?error=github_save_failed', url.origin)
    )
  }

  console.log('[github-connect/callback] Successfully connected GitHub user:', githubUser.login)
  return NextResponse.redirect(
    new URL('/settings?github=connected', url.origin)
  )
}

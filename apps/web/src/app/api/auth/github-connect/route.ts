import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID
  if (!clientId) {
    console.error('[github-connect] GITHUB_APP_CLIENT_ID is not set')
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 })
  }

  // Trim any whitespace/newlines that may have been introduced via env config
  const cleanClientId = clientId.trim()

  // Sanity-check: GitHub OAuth App client IDs start with "Ov" or "Iv" and are 20 chars
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(cleanClientId)) {
    console.error('[github-connect] GITHUB_APP_CLIENT_ID looks malformed', {
      length: cleanClientId.length,
      preview: `${cleanClientId.slice(0, 4)}...`,
    })
    return NextResponse.json(
      { error: 'GitHub client ID appears malformed' },
      { status: 500 }
    )
  }

  // Build the callback URL explicitly so GitHub doesn't rely on the OAuth app default
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/github-connect/callback`

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url')
  const params = new URLSearchParams({
    client_id: cleanClientId,
    redirect_uri: redirectUri,
    scope: 'repo,read:user',
    state,
  })

  const authorizeUrl = `https://github.com/login/oauth/authorize?${params}`

  console.log('[github-connect] Redirecting to GitHub OAuth', {
    clientId: cleanClientId,
    redirectUri,
    authorizeUrl,
  })

  return NextResponse.redirect(authorizeUrl)
}

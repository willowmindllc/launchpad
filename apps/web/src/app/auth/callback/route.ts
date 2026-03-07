import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptPendingInvites } from '@/lib/supabase/queries'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Accept any pending board invites for this user
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        try {
          await acceptPendingInvites(supabase, user.id, user.email)
        } catch {
          // Non-critical — don't block login
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}

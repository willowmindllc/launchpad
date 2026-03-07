import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptPendingInvites } from '@/lib/supabase/queries'
import type { ProjectInvite } from '@/types/database'

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) return <InviteError message="Missing invite token." />

  const supabase = await createClient()
  const invite = await lookupInvite(supabase, token)
  if (!invite) return <InviteError message="This invite link is invalid or has expired." />
  if (invite.status === 'accepted') {
    redirect(`/projects/${invite.project_id}?welcome=true`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const next = encodeURIComponent(`/invite/accept?token=${token}`)
    redirect(`/login?next=${next}`)
  }

  // Accept the invite via the existing RPC
  try {
    await acceptPendingInvites(supabase, user.id, user.email!)
  } catch (err) {
    console.error('Failed to accept invite:', err)
    return <InviteError message="Something went wrong accepting the invite. Please try again." />
  }

  redirect(`/projects/${invite.project_id}?welcome=true`)
}

async function lookupInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inviteId: string,
): Promise<ProjectInvite | null> {
  const { data, error } = await supabase
    .from('project_invites')
    .select('*')
    .eq('id', inviteId)
    .single()
  if (error || !data) return null
  return data as ProjectInvite
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md rounded-xl border border-border/50 bg-card p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">🚀 LaunchPad</h1>
        <p className="mb-4 text-muted-foreground">{message}</p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
        >
          Go to Login
        </a>
      </div>
    </div>
  )
}

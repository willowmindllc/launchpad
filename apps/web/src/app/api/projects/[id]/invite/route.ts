import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvite, deleteInvite, getProject, getProjectMemberRole } from '@/lib/supabase/queries'
import { sendInviteEmail } from '@/lib/email'
import type { MemberRole } from '@/types/database'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { email, role } = await request.json()
  if (!email || !role) {
    return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
  }

  // Verify caller is owner or admin
  const callerRole = await getProjectMemberRole(supabase, projectId, user.id)
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const invite = await createInvite(supabase, {
      project_id: projectId,
      invited_email: email,
      role: role as MemberRole,
      invited_by: user.id,
    })

    // Send invite email (non-blocking — don't fail the invite if email fails)
    const inviterName = user.user_metadata?.full_name || user.email || 'A team member'
    const project = await getProject(supabase, projectId)
    sendInviteEmail({
      to: email,
      inviterName,
      projectName: project.name,
      inviteToken: invite.id,
    }).catch((err) => console.error('Invite email failed:', err))

    return NextResponse.json({ invite })
  } catch (err: unknown) {
    // Unique constraint violation — duplicate invite
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'Invite already exists for this email' }, { status: 409 })
    }
    console.error('Failed to create invite:', err)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { inviteId } = await request.json()
  if (!inviteId) {
    return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 })
  }

  // Verify caller is owner or admin
  const callerRole = await getProjectMemberRole(supabase, projectId, user.id)
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await deleteInvite(supabase, inviteId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete invite:', err)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
}

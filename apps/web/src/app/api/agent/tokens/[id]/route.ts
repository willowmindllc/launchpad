import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/agent-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tokenId } = await params

  const rl = await rateLimit(req, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(rl.reset)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const serviceClient = createServiceClient()

  // Get token to check project ownership
  const { data: token, error: fetchError } = await serviceClient
    .from('agent_tokens')
    .select('id, project_id')
    .eq('id', tokenId)
    .single()

  if (fetchError || !token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  // Verify user is owner or admin of the project
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', token.project_id)
    .single()

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', token.project_id)
    .eq('user_id', user.id)
    .single()

  const isOwner = project?.owner_id === user.id
  const isAdmin = membership?.role === 'admin'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await serviceClient
    .from('agent_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

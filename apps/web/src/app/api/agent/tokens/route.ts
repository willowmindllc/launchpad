import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjectMemberRole } from '@/lib/supabase/queries'
import { hashToken, createServiceClient } from '@/lib/agent-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import type { AgentPermission } from '@/types/database'

const VALID_PERMISSIONS: AgentPermission[] = ['read', 'write', 'admin']

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(rl.reset)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { project_id, name, permissions } = body

  if (!project_id || !name) {
    return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
  }

  // Validate permissions
  const perms: AgentPermission[] = permissions || ['read', 'write']
  if (!Array.isArray(perms) || !perms.every((p: string) => VALID_PERMISSIONS.includes(p as AgentPermission))) {
    return NextResponse.json({ error: 'Invalid permissions. Valid: read, write, admin' }, { status: 400 })
  }

  // Verify user is admin or owner
  const callerRole = await getProjectMemberRole(supabase, project_id, user.id)
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden. Must be project owner or admin.' }, { status: 403 })
  }

  // Generate token: lp_ + two UUIDs without dashes
  const rawToken = 'lp_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const tokenHash = await hashToken(rawToken)

  const serviceClient = createServiceClient()
  const { data: token, error } = await serviceClient
    .from('agent_tokens')
    .insert({
      project_id,
      name,
      token_hash: tokenHash,
      permissions: perms,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create agent token:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }

  return NextResponse.json({ token: rawToken, id: token.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(rl.reset)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }

  // Verify user is admin or owner
  const callerRole = await getProjectMemberRole(supabase, projectId, user.id)
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceClient = createServiceClient()
  const { data: tokens, error } = await serviceClient
    .from('agent_tokens')
    .select('id, project_id, name, permissions, created_by, last_used_at, revoked_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  }

  return NextResponse.json({ tokens: tokens || [] })
}

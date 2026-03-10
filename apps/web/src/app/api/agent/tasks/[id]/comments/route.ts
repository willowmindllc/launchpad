import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, createServiceClient } from '@/lib/agent-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const AGENT_RATE_LIMIT = { limit: 60, windowSeconds: 60 }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params

  const authResult = await authenticateAgent(req)
  if ('error' in authResult) return authResult.error

  const { auth } = authResult
  if (!auth.permissions.includes('write') && !auth.permissions.includes('admin')) {
    return NextResponse.json({ error: 'Insufficient permissions. Requires: write' }, { status: 403 })
  }

  const rl = await rateLimit(req, AGENT_RATE_LIMIT, `agent:${auth.tokenId}`)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const supabase = createServiceClient()

  // Verify task belongs to the token's project
  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('id, project_id')
    .eq('id', taskId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (existing.project_id !== auth.projectId) {
    return NextResponse.json({ error: 'Task does not belong to this project' }, { status: 403 })
  }

  const body = await req.json()
  const { content } = body

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: auth.createdBy,
      content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }

  return NextResponse.json({ comment }, { status: 201 })
}

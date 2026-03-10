import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, createServiceClient } from '@/lib/agent-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import type { TaskStatus, TaskPriority } from '@/types/database'

const AGENT_RATE_LIMIT = { limit: 60, windowSeconds: 60 }

export async function GET(req: NextRequest) {
  const authResult = await authenticateAgent(req)
  if ('error' in authResult) return authResult.error

  const { auth } = authResult
  const rl = await rateLimit(req, AGENT_RATE_LIMIT, `agent:${auth.tokenId}`)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const url = req.nextUrl
  const status = url.searchParams.get('status') as TaskStatus | null
  const priority = url.searchParams.get('priority') as TaskPriority | null
  const search = url.searchParams.get('search')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const supabase = createServiceClient()
  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('project_id', auth.projectId)
    .is('deleted_at', null)

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (search) query = query.ilike('title', `%${search}%`)

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data: tasks, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }

  return NextResponse.json({ tasks: tasks || [], total: count || 0 })
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateAgent(req)
  if ('error' in authResult) return authResult.error

  const { auth } = authResult
  if (!auth.permissions.includes('write') && !auth.permissions.includes('admin')) {
    return NextResponse.json({ error: 'Insufficient permissions. Requires: write' }, { status: 403 })
  }

  const rl = await rateLimit(req, AGENT_RATE_LIMIT, `agent:${auth.tokenId}`)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const body = await req.json()
  const { title, description, status, priority, assignee_id } = body

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get project for ticket prefix
  const { data: project } = await supabase
    .from('projects')
    .select('ticket_prefix')
    .eq('id', auth.projectId)
    .single()

  // Auto-number with ticket prefix if set
  let finalTitle = title
  if (project?.ticket_prefix) {
    const prefix = project.ticket_prefix
    const prefixPattern = new RegExp(`^${prefix}-\\d{3}`)
    if (!prefixPattern.test(title)) {
      // Find max existing number
      const { data: existing } = await supabase
        .from('tasks')
        .select('title')
        .eq('project_id', auth.projectId)
        .ilike('title', `${prefix}-%`)

      let maxNum = 0
      const numPattern = new RegExp(`^${prefix}-(\\d{3})`)
      for (const t of existing || []) {
        const match = t.title.match(numPattern)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
      finalTitle = `${prefix}-${String(maxNum + 1).padStart(3, '0')}: ${title}`
    }
  }

  // Calculate position
  const taskStatus = status || 'backlog'
  const { count: posCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', auth.projectId)
    .eq('status', taskStatus)
    .is('deleted_at', null)

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: finalTitle,
      description: description || null,
      status: taskStatus,
      priority: priority || 'medium',
      project_id: auth.projectId,
      assignee_id: assignee_id || null,
      position: (posCount || 0) + 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  return NextResponse.json({ task }, { status: 201 })
}

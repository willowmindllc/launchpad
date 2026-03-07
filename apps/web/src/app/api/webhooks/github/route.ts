import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

async function verifySignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return signature === expected
}

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  const valid = await verifySignature(body, signature, secret)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event')
  const payload = JSON.parse(body)

  // Use service role client for webhook operations (no user session)
  const supabase = createServiceClient()

  try {
    if (event === 'issues') {
      await handleIssueEvent(supabase, payload)
    } else if (event === 'pull_request') {
      await handlePullRequestEvent(supabase, payload)
    }
    // Ignore other events (ping, etc.)
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ ok: true })
}

async function findProjectByRepo(supabase: ReturnType<typeof createServiceClient>, owner: string, repo: string) {
  const { data: link } = await supabase
    .from('project_github_links')
    .select('project_id, sync_issues')
    .eq('repo_owner', owner)
    .eq('repo_name', repo)
    .single()

  if (!link) return null

  // Get the project owner for automated comments
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', link.project_id)
    .single()

  return { ...link, owner_id: project?.owner_id ?? null }
}

async function handleIssueEvent(supabase: ReturnType<typeof createServiceClient>, payload: Record<string, unknown>) {
  const action = payload.action as string
  const issue = payload.issue as { number: number; title: string; body: string | null; html_url: string; labels?: { name: string }[] }
  const repo = payload.repository as { owner: { login: string }; name: string }

  const link = await findProjectByRepo(supabase, repo.owner.login, repo.name)
  if (!link || !link.sync_issues) return

  if (action === 'opened') {
    // Map labels to priority
    const labels = issue.labels?.map(l => l.name.toLowerCase()) || []
    let priority: string = 'medium'
    if (labels.includes('bug') || labels.includes('critical')) priority = 'high'
    if (labels.includes('enhancement') || labels.includes('feature')) priority = 'medium'
    if (labels.includes('urgent') || labels.includes('p0')) priority = 'urgent'

    // Get max position in backlog
    const { data: maxPos } = await supabase
      .from('tasks')
      .select('position')
      .eq('project_id', link.project_id)
      .eq('status', 'backlog')
      .order('position', { ascending: false })
      .limit(1)

    const position = maxPos && maxPos.length > 0 ? maxPos[0].position + 1 : 0

    await supabase.from('tasks').insert({
      title: issue.title,
      description: issue.body || null,
      status: 'backlog',
      priority,
      project_id: link.project_id,
      position,
      github_issue_number: issue.number,
      github_issue_url: issue.html_url,
    })
  } else if (action === 'closed') {
    // Move matching task to done
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', link.project_id)
      .eq('github_issue_number', issue.number)
      .single()

    if (task) {
      await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', task.id)
    }
  }
}

async function handlePullRequestEvent(supabase: ReturnType<typeof createServiceClient>, payload: Record<string, unknown>) {
  const action = payload.action as string
  const pr = payload.pull_request as { number: number; title: string; body: string | null; html_url: string; merged: boolean }
  const repo = payload.repository as { owner: { login: string }; name: string }

  const link = await findProjectByRepo(supabase, repo.owner.login, repo.name)
  if (!link) return

  // Look for references like LP-XXX or #N in PR body/title
  const text = `${pr.title} ${pr.body || ''}`

  // Match issue references: #123
  const issueRefs = text.match(/#(\d+)/g)?.map(m => parseInt(m.slice(1))) || []

  if (action === 'opened' && link.owner_id) {
    // Add comment to any referenced tasks (using project owner as commenter)
    for (const issueNum of issueRefs) {
      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', link.project_id)
        .eq('github_issue_number', issueNum)
        .single()

      if (task) {
        await supabase.from('task_comments').insert({
          task_id: task.id,
          user_id: link.owner_id,
          content: `PR #${pr.number} opened: ${pr.html_url}`,
        })
      }
    }
  } else if (action === 'closed' && pr.merged) {
    // Move linked tasks to done
    for (const issueNum of issueRefs) {
      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', link.project_id)
        .eq('github_issue_number', issueNum)
        .single()

      if (task) {
        await supabase
          .from('tasks')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', task.id)
      }
    }
  }
}

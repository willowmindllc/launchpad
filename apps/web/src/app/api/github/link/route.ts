import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGitHubWebhook, deleteGitHubWebhook } from '@/lib/github'

const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/github'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { projectId, repoOwner, repoName } = await request.json()
  if (!projectId || !repoOwner || !repoName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Get user's GitHub token
  const { data: connection } = await supabase
    .from('github_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET!

  try {
    // Create webhook on the repo
    const webhook = await createGitHubWebhook(
      connection.access_token,
      repoOwner,
      repoName,
      WEBHOOK_URL,
      webhookSecret
    )

    // Store the link
    const { data, error } = await supabase
      .from('project_github_links')
      .upsert({
        project_id: projectId,
        repo_owner: repoOwner,
        repo_name: repoName,
        webhook_id: webhook.id,
        sync_issues: true,
      }, { onConflict: 'project_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ link: data })
  } catch (err) {
    console.error('Failed to link repo:', err)
    return NextResponse.json({ error: 'Failed to link repo' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { projectId } = await request.json()
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  // Get existing link
  const { data: link } = await supabase
    .from('project_github_links')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (!link) {
    return NextResponse.json({ error: 'No link found' }, { status: 404 })
  }

  // Get user's GitHub token to delete webhook
  const { data: connection } = await supabase
    .from('github_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (connection && link.webhook_id) {
    try {
      await deleteGitHubWebhook(
        connection.access_token,
        link.repo_owner,
        link.repo_name,
        link.webhook_id
      )
    } catch (err) {
      console.error('Failed to delete webhook (continuing):', err)
    }
  }

  // Delete the link
  const { error } = await supabase
    .from('project_github_links')
    .delete()
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

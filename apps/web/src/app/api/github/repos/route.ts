import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGitHubRepos } from '@/lib/github'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: connection } = await supabase
    .from('github_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  try {
    const repos = await getGitHubRepos(connection.access_token)
    return NextResponse.json({
      repos: repos.map((r) => ({
        id: r.id,
        full_name: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        html_url: r.html_url,
        description: r.description,
      })),
    })
  } catch (err) {
    console.error('Failed to fetch repos:', err)
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 })
  }
}

const GITHUB_API = 'https://api.github.com'

interface GitHubRepo {
  id: number
  full_name: string
  name: string
  owner: { login: string }
  private: boolean
  html_url: string
  description: string | null
}

interface GitHubWebhook {
  id: number
  url: string
  active: boolean
}

interface GitHubIssue {
  number: number
  html_url: string
  title: string
  state: string
}

function headers(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function getGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&sort=updated&page=${page}`,
      { headers: headers(accessToken) }
    )
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const data: GitHubRepo[] = await res.json()
    repos.push(...data)
    if (data.length < 100) break
    page++
  }
  return repos
}

export async function createGitHubWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string
): Promise<GitHubWebhook> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks`, {
    method: 'POST',
    headers: headers(accessToken),
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['issues', 'pull_request'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to create webhook: ${res.status} ${body}`)
  }
  return res.json()
}

export async function deleteGitHubWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  webhookId: number
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/hooks/${webhookId}`,
    { method: 'DELETE', headers: headers(accessToken) }
  )
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete webhook: ${res.status}`)
  }
}

export async function createGitHubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body?: string
): Promise<GitHubIssue> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: headers(accessToken),
    body: JSON.stringify({ title, body: body || '' }),
  })
  if (!res.ok) throw new Error(`Failed to create issue: ${res.status}`)
  return res.json()
}

export async function updateGitHubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  updates: { state?: 'open' | 'closed'; title?: string; body?: string }
): Promise<GitHubIssue> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      method: 'PATCH',
      headers: headers(accessToken),
      body: JSON.stringify(updates),
    }
  )
  if (!res.ok) throw new Error(`Failed to update issue: ${res.status}`)
  return res.json()
}

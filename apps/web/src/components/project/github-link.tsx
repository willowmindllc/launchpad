'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Github, ExternalLink, Loader2, Unlink } from 'lucide-react'
import type { ProjectGitHubLink } from '@/types/database'

interface Repo {
  id: number
  full_name: string
  name: string
  owner: string
  private: boolean
  html_url: string
  description: string | null
}

interface GitHubLinkProps {
  projectId: string
}

export function GitHubLink({ projectId }: GitHubLinkProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [hasConnection, setHasConnection] = useState(false)
  const [link, setLink] = useState<ProjectGitHubLink | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [linking, setLinking] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user has GitHub connected
      const { data: conn } = await supabase
        .from('github_connections')
        .select('id')
        .eq('user_id', user.id)
        .single()

      setHasConnection(!!conn)

      // Check existing link
      const { data: existingLink } = await supabase
        .from('project_github_links')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (existingLink) {
        setLink(existingLink as ProjectGitHubLink)
      }

      setLoading(false)
    }
    load()
  }, [supabase, projectId])

  const loadRepos = async () => {
    setLoadingRepos(true)
    setError(null)
    try {
      const res = await fetch('/api/github/repos')
      if (!res.ok) throw new Error('Failed to fetch repos')
      const data = await res.json()
      setRepos(data.repos)
    } catch {
      setError('Failed to load repositories')
    } finally {
      setLoadingRepos(false)
    }
  }

  useEffect(() => {
    if (hasConnection && !link) {
      loadRepos()
    }
  }, [hasConnection, link])

  const handleLink = async () => {
    if (!selectedRepo) return
    setLinking(true)
    setError(null)

    const repo = repos.find(r => r.full_name === selectedRepo)
    if (!repo) return

    try {
      const res = await fetch('/api/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repoOwner: repo.owner,
          repoName: repo.name,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to link')
      }

      const data = await res.json()
      setLink(data.link)
      setSelectedRepo('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link repo')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    setLinking(true)
    setError(null)

    try {
      const res = await fetch('/api/github/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) throw new Error('Failed to unlink')

      setLink(null)
      loadRepos()
    } catch {
      setError('Failed to unlink repo')
    } finally {
      setLinking(false)
    }
  }

  if (loading) return null

  if (!hasConnection) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Github className="size-3.5" />
        <a href="/settings" className="hover:text-foreground underline">
          Connect GitHub
        </a>
        <span>to link a repo</span>
      </div>
    )
  }

  if (link) {
    return (
      <div className="flex items-center gap-2">
        <Github className="size-3.5 text-muted-foreground" />
        <a
          href={`https://github.com/${link.repo_owner}/${link.repo_name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {link.repo_owner}/{link.repo_name}
          <ExternalLink className="size-3" />
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
          onClick={handleUnlink}
          disabled={linking}
        >
          {linking ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3" />}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Github className="size-3.5 text-muted-foreground shrink-0" />
      {loadingRepos ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Select value={selectedRepo} onValueChange={setSelectedRepo}>
            <SelectTrigger className="h-7 text-xs w-[200px]">
              <SelectValue placeholder="Select repo..." />
            </SelectTrigger>
            <SelectContent>
              {repos.map((repo) => (
                <SelectItem key={repo.id} value={repo.full_name} className="text-xs">
                  {repo.full_name}
                  {repo.private && ' (private)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleLink}
            disabled={!selectedRepo || linking}
          >
            {linking ? <Loader2 className="size-3 animate-spin" /> : 'Link'}
          </Button>
        </>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

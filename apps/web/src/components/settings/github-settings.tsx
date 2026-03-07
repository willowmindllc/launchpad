'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Github, ExternalLink, Loader2 } from 'lucide-react'

interface GitHubConnectionData {
  github_username: string
  github_avatar_url: string | null
}

export function GitHubSettings() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connection, setConnection] = useState<GitHubConnectionData | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('github_connections')
        .select('github_username, github_avatar_url')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setConnection(data)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  // Check URL params for success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('github') === 'connected') {
      setMessage({ type: 'success', text: 'GitHub account connected successfully!' })
      // Clean URL
      window.history.replaceState({}, '', '/settings')
      // Reload connection data
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase
          .from('github_connections')
          .select('github_username, github_avatar_url')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setConnection(data)
          })
      })
    }
    const errorCode = params.get('error')
    if (errorCode?.startsWith('github_')) {
      const errorMessages: Record<string, string> = {
        github_access_denied: 'You denied the GitHub authorization request.',
        github_oauth_error: 'GitHub returned an error. The OAuth app may be misconfigured.',
        github_no_code: 'No authorization code was received from GitHub.',
        github_misconfigured: 'GitHub integration is not configured on the server.',
        github_token_failed: 'Failed to exchange the authorization code. Please try again.',
        github_code_expired: 'The authorization code has expired. Please try connecting again.',
        github_no_token: 'GitHub did not return an access token.',
        github_user_failed: 'Could not fetch your GitHub profile.',
        github_save_failed: 'Connected to GitHub but failed to save. Please try again.',
      }
      setMessage({
        type: 'error',
        text: errorMessages[errorCode] || 'Failed to connect GitHub. Please try again.',
      })
      window.history.replaceState({}, '', '/settings')
    }
  }, [supabase])

  const handleConnect = () => {
    window.location.href = '/api/auth/github-connect'
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('github_connections')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setConnection(null)
      setMessage({ type: 'success', text: 'GitHub account disconnected.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' })
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="size-5" /> GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="size-5" /> GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to sync issues and PRs with your projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                {connection.github_avatar_url && (
                  <AvatarImage src={connection.github_avatar_url} alt={connection.github_username} />
                )}
                <AvatarFallback>{connection.github_username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{connection.github_username}</p>
                <a
                  href={`https://github.com/${connection.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View profile <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} className="gap-2">
            <Github className="size-4" />
            Connect GitHub
          </Button>
        )}

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

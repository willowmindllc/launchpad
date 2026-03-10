'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { AgentPermission } from '@/types/database'

interface AgentTokenDisplay {
  id: string
  name: string
  permissions: AgentPermission[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface AgentTokensSettingsProps {
  projectId: string
}

export function AgentTokensSettings({ projectId }: AgentTokensSettingsProps) {
  const [tokens, setTokens] = useState<AgentTokenDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [permissions, setPermissions] = useState<AgentPermission[]>(['read', 'write'])
  const [generating, setGenerating] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/tokens?project_id=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleGenerate = async () => {
    if (!tokenName.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/agent/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: tokenName.trim(),
          permissions,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedToken(data.token)
        setTokenName('')
        setPermissions(['read', 'write'])
        fetchTokens()
      }
    } catch {
      // silently fail
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (tokenId: string) => {
    setRevoking(tokenId)
    try {
      const res = await fetch(`/api/agent/tokens/${tokenId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTokens()
      }
    } catch {
      // silently fail
    } finally {
      setRevoking(null)
    }
  }

  const handleCopy = async () => {
    if (generatedToken) {
      await navigator.clipboard.writeText(generatedToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const togglePermission = (perm: AgentPermission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent API Tokens</CardTitle>
            <CardDescription>Generate tokens for AI agents to manage tasks on this project.</CardDescription>
          </div>
          <Dialog
            open={generateOpen}
            onOpenChange={(open) => {
              setGenerateOpen(open)
              if (!open) {
                setGeneratedToken(null)
                setCopied(false)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">Generate Token</Button>
            </DialogTrigger>
            <DialogContent>
              {generatedToken ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Token Generated</DialogTitle>
                    <DialogDescription>
                      Copy this token now. It won&apos;t be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={generatedToken}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={handleCopy}>
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-500">
                      Store this token securely. You will not be able to see it again.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setGenerateOpen(false); setGeneratedToken(null) }}>
                      Done
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Generate Agent Token</DialogTitle>
                    <DialogDescription>
                      Create a token for an AI agent to access this project&apos;s tasks via API.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="token-name">Token Name</Label>
                      <Input
                        id="token-name"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        placeholder="e.g. Mahadev Builder, CI Bot"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="space-y-2">
                        {(['read', 'write', 'admin'] as AgentPermission[]).map((perm) => (
                          <div key={perm} className="flex items-center gap-2">
                            <Checkbox
                              id={`perm-${perm}`}
                              checked={permissions.includes(perm)}
                              onCheckedChange={() => togglePermission(perm)}
                            />
                            <Label htmlFor={`perm-${perm}`} className="text-sm font-normal capitalize">
                              {perm}
                              <span className="text-muted-foreground ml-1">
                                {perm === 'read' && '— List and view tasks'}
                                {perm === 'write' && '— Create, update tasks and comments'}
                                {perm === 'admin' && '— Full access including token management'}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating || !tokenName.trim() || permissions.length === 0}
                    >
                      {generating ? 'Generating...' : 'Generate'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet. Generate one to get started.</p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{token.name}</span>
                    {token.revoked_at ? (
                      <Badge variant="destructive" className="text-xs">Revoked</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Permissions: {token.permissions.join(', ')}</span>
                    <span>Created: {formatDate(token.created_at)}</span>
                    <span>Last used: {formatDate(token.last_used_at)}</span>
                  </div>
                </div>
                {!token.revoked_at && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revoking === token.id}
                      >
                        {revoking === token.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke token?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will immediately revoke the token &quot;{token.name}&quot;. Any agents using this token will lose access.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRevoke(token.id)}>
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

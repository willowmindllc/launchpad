'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getProjectMembers,
  getProjectInvites,
  updateMemberRole,
  removeMember,
} from '@/lib/supabase/queries'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, X, Loader2 } from 'lucide-react'
import type { MemberRole, Profile, ProjectMember, ProjectInvite } from '@/types/database'
import { MEMBER_ROLE_LABELS, SHAREABLE_ROLES } from '@/types/database'

type MemberWithProfile = ProjectMember & { profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> }

interface ShareDialogProps {
  projectId: string
  currentUserRole: MemberRole
}

export function ShareDialog({ projectId, currentUserRole }: ShareDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [invites, setInvites] = useState<ProjectInvite[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'

  const fetchData = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([
        getProjectMembers(supabase, projectId),
        getProjectInvites(supabase, projectId),
      ])
      setMembers(m)
      setInvites(i)
    } catch {
      // non-critical
    }
  }, [supabase, projectId])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  const handleInvite = useCallback(async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      if (res.status === 409) {
        setError('Invite already exists for this email')
      } else if (!res.ok) {
        setError('Failed to send invite')
      } else {
        setEmail('')
        fetchData()
      }
    } catch {
      setError('Failed to send invite')
    } finally {
      setLoading(false)
    }
  }, [email, role, projectId, fetchData])

  const handleCancelInvite = useCallback(async (inviteId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/invite`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      fetchData()
    } catch {
      // silently fail
    }
  }, [projectId, fetchData])

  const handleRoleChange = useCallback(async (userId: string, newRole: MemberRole) => {
    try {
      await updateMemberRole(supabase, projectId, userId, newRole)
      fetchData()
    } catch {
      // silently fail
    }
  }, [supabase, projectId, fetchData])

  const handleRemoveMember = useCallback(async (userId: string) => {
    try {
      await removeMember(supabase, projectId, userId)
      fetchData()
    } catch {
      // silently fail
    }
  }, [supabase, projectId, fetchData])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Invite form */}
          {isAdmin && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleInvite() }}
              className="flex gap-2"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHAREABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={loading || !email.trim()}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Invite'}
              </Button>
            </form>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Members list */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground">Members</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {(m.profile.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-sm">
                      {m.profile.full_name || 'Unknown'}
                    </span>
                    {m.profile.email && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.profile.email}
                      </span>
                    )}
                  </div>
                  {m.role === 'owner' ? (
                    <Badge variant="secondary" className="text-[10px]">Owner</Badge>
                  ) : isAdmin ? (
                    <div className="flex items-center gap-1">
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleRoleChange(m.user_id, v as MemberRole)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHAREABLE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(m.user_id)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {MEMBER_ROLE_LABELS[m.role]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Pending Invites</h4>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                      @
                    </div>
                    <span className="flex-1 truncate text-sm text-muted-foreground">
                      {inv.invited_email}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {MEMBER_ROLE_LABELS[inv.role]}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleCancelInvite(inv.id)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

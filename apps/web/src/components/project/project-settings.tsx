'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateProject, deleteProject, archiveProject } from '@/lib/supabase/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { Project } from '@/types/database'

interface ProjectSettingsProps {
  project: Project
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [ticketPrefix, setTicketPrefix] = useState(project.ticket_prefix || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const prefixValue = ticketPrefix.trim().toUpperCase()
      const validPrefix = /^[A-Z]{2,5}$/.test(prefixValue) ? prefixValue : null
      await updateProject(supabase, project.id, {
        name: name.trim(),
        description: description.trim() || null,
        ticket_prefix: ticketPrefix.trim() ? validPrefix : null,
      })
      setMessage({ type: 'success', text: 'Project updated.' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to update project.' })
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await archiveProject(supabase, project.id)
      router.push('/projects')
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to archive project.' })
      setArchiving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteProject(supabase, project.id)
      router.push('/projects')
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete project.' })
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push(`/projects/${project.id}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>←</span>
        <span>Back to {project.name}</span>
      </button>

      {/* General Settings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Update your project name and description.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Input
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this project about?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-prefix">Ticket Prefix</Label>
              <Input
                id="ticket-prefix"
                value={ticketPrefix}
                onChange={(e) => setTicketPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
                placeholder="e.g. LP, SB, WM"
                maxLength={5}
                className="w-32 uppercase"
              />
              <p className="text-xs text-muted-foreground">
                {ticketPrefix && /^[A-Z]{2,5}$/.test(ticketPrefix)
                  ? `New tasks will be numbered ${ticketPrefix}-001, ${ticketPrefix}-002, etc.`
                  : 'Optional. 2–5 letters. Auto-numbers new tasks.'}
              </p>
            </div>
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {message.text}
              </p>
            )}
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-500">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Archive */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
            <div>
              <p className="text-sm font-medium">Archive this project</p>
              <p className="text-xs text-muted-foreground">Hide from the project list. Can be restored later.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={archiving}>
                  {archiving ? 'Archiving...' : 'Archive'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide <strong>{project.name}</strong> from your project list. You can restore it later from the archived section.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between rounded-lg border border-red-500/30 p-4">
            <div>
              <p className="text-sm font-medium text-red-500">Delete this project</p>
              <p className="text-xs text-muted-foreground">Permanently delete this project and all its tasks. This cannot be undone.</p>
            </div>
            <AlertDialog onOpenChange={() => setDeleteConfirmName('')}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{project.name}</strong> and all its tasks, comments, and activity. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label>Type <strong>{project.name}</strong> to confirm</Label>
                  <Input
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={project.name}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteConfirmName !== project.name}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

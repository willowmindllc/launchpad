'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createProject, deleteProject, archiveProject, restoreProject } from '@/lib/supabase/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Project, MemberRole } from '@/types/database'
import { MEMBER_ROLE_LABELS } from '@/types/database'

interface ProjectListProps {
  projects: (Project & { taskProgress: { done: number; total: number } })[]
  sharedProjects?: (Project & { role: MemberRole; taskProgress: { done: number; total: number } })[]
  archivedProjects?: Project[]
  userId: string
}

export function ProjectList({ projects, sharedProjects = [], archivedProjects = [], userId }: ProjectListProps) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async () => {
    if (!newName.trim()) return
    setLoading(true)
    try {
      await createProject(supabase, { name: newName, description: newDesc || undefined, owner_id: userId })
      setNewName('')
      setNewDesc('')
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmName !== deleteTarget.name) return
    setDeleting(true)
    try {
      await archiveProject(supabase, deleteTarget.id)
      setDeleteTarget(null)
      setDeleteConfirmName('')
      router.refresh()
    } catch (err) {
      console.error('Failed to delete project:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      await restoreProject(supabase, id)
      router.refresh()
    } catch (err) {
      console.error('Failed to restore project:', err)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate() }} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="My Awesome Project" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="What's this project about?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !newName.trim()}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Projects */}
      {projects.length > 0 && sharedProjects.length > 0 && (
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">My Projects</h3>
      )}
      {projects.length === 0 && sharedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-6 text-6xl">🚀</div>
          <h2 className="mb-2 text-2xl font-bold">No projects yet</h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Create your first project to start tracking tasks with your own Kanban board.
          </p>
          <Button size="lg" onClick={() => setOpen(true)}>
            Create Your First Project
          </Button>
          <div className="mt-12 grid max-w-lg gap-4 text-left">
            <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-medium">Kanban Board</p>
                <p className="text-sm text-muted-foreground">Drag-and-drop tasks across Backlog, In Progress, Review, and Done</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
              <span className="text-xl">🤖</span>
              <div>
                <p className="font-medium">AI Chat-to-Board</p>
                <p className="text-sm text-muted-foreground">Chat to create tasks, get AI suggestions, and auto-number tickets</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-medium">Team Sharing</p>
                <p className="text-sm text-muted-foreground">Invite teammates, assign tasks, and track progress together</p>
              </div>
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? null : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const { done, total } = project.taskProgress
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const isOwner = project.owner_id === userId

            return (
              <div key={project.id} className="relative">
                <Link href={`/projects/${project.id}`}>
                  <Card className="border-border/50 transition-colors hover:border-primary/50 hover:bg-accent/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg pr-6">{project.name}</CardTitle>
                        <Badge variant="secondary">
                          {total === 0 ? 'No tasks' : `${done}/${total} done`}
                        </Badge>
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {total > 0 && (
                        <div className="mb-2 h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
                {isOwner && (
                  <div className="absolute right-2 top-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          onClick={(e) => e.preventDefault()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}/settings`}>Settings</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onSelect={() => setDeleteTarget(project)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Shared with me */}
      {sharedProjects.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 text-sm font-medium text-muted-foreground">Shared with me</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedProjects.map((project) => {
              const { done, total } = project.taskProgress
              const pct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="border-border/50 transition-colors hover:border-primary/50 hover:bg-accent/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {MEMBER_ROLE_LABELS[project.role]}
                          </Badge>
                          <Badge variant="secondary">
                            {total === 0 ? 'No tasks' : `${done}/${total} done`}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {total > 0 && (
                        <div className="mb-2 h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Archived projects */}
      {archivedProjects.length > 0 && (
        <>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="mt-8 mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}
            >
              <path d="m9 18 6-6-6-6"/>
            </svg>
            Archived ({archivedProjects.length})
          </button>
          {showArchived && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedProjects.map((project) => (
                <Card key={project.id} className="border-border/50 opacity-70">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant="outline">Archived</Badge>
                    </div>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {project.archived_at
                        ? (() => {
                            const daysLeft = Math.max(0, 7 - Math.floor((Date.now() - new Date(project.archived_at).getTime()) / 86400000))
                            return daysLeft === 0
                              ? '⚠️ Deleting soon'
                              : `🗑️ Auto-deletes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                          })()
                        : `Created ${new Date(project.created_at).toLocaleDateString()}`}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restoringId === project.id}
                      onClick={() => handleRestore(project.id)}
                    >
                      {restoringId === project.id ? 'Restoring...' : 'Restore'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Type <strong>{deleteTarget?.name}</strong> to confirm</Label>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.name}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deleteConfirmName !== deleteTarget?.name}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

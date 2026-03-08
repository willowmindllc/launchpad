'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTask } from '@/lib/supabase/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskStatus, TaskPriority } from '@/types/database'
import { TASK_PRIORITY_LABELS } from '@/types/database'

interface CreateTaskDialogLiveProps {
  defaultStatus?: TaskStatus
  projectId: string
  onCreated?: () => void
  /** When provided, the dialog is controlled externally (no trigger button rendered) */
  externalOpen?: boolean
  onExternalOpenChange?: (open: boolean) => void
}

export function CreateTaskDialog({ defaultStatus = 'backlog', projectId, onCreated, externalOpen, onExternalOpenChange }: CreateTaskDialogLiveProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isExternal = externalOpen !== undefined
  const open = isExternal ? externalOpen : internalOpen
  const setOpen = isExternal ? (onExternalOpenChange ?? (() => {})) : setInternalOpen
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      await createTask(supabase, {
        title,
        description: description || undefined,
        priority,
        status: defaultStatus,
        project_id: projectId,
      })
      setTitle('')
      setDescription('')
      setPriority('medium')
      setOpen(false)
      onCreated?.()
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isExternal && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
            +
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleCreate() }} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input placeholder="Add details..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

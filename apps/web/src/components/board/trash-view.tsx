'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getDeletedTasks,
  restoreTask,
  permanentlyDeleteTask,
} from '@/lib/supabase/queries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Undo2, Trash2, Loader2 } from 'lucide-react'
import type { Task, TaskPriority } from '@/types/database'
import { TASK_PRIORITY_LABELS } from '@/types/database'
import { cn } from '@/lib/utils'

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

interface TrashViewProps {
  projectId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestored: () => void
}

export function TrashView({
  projectId,
  open,
  onOpenChange,
  onRestored,
}: TrashViewProps) {
  const supabase = createClient()
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetchDeletedTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDeletedTasks(supabase, projectId)
      setDeletedTasks(data)
    } catch (err) {
      console.error('Failed to load deleted tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId])

  useEffect(() => {
    if (open) fetchDeletedTasks()
  }, [open, fetchDeletedTasks])

  const handleRestore = useCallback(
    async (taskId: string) => {
      setActionId(taskId)
      try {
        await restoreTask(supabase, taskId)
        setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId))
        onRestored()
      } catch (err) {
        console.error('Failed to restore task:', err)
      } finally {
        setActionId(null)
      }
    },
    [supabase, onRestored]
  )

  const handlePermanentDelete = useCallback(
    async (taskId: string) => {
      setActionId(taskId)
      try {
        await permanentlyDeleteTask(supabase, taskId)
        setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId))
      } catch (err) {
        console.error('Failed to permanently delete task:', err)
      } finally {
        setActionId(null)
      }
    },
    [supabase]
  )

  const handleEmptyTrash = useCallback(async () => {
    setActionId('all')
    try {
      await Promise.all(
        deletedTasks.map((t) => permanentlyDeleteTask(supabase, t.id))
      )
      setDeletedTasks([])
    } catch (err) {
      console.error('Failed to empty trash:', err)
    } finally {
      setActionId(null)
    }
  }, [supabase, deletedTasks])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5" />
            Trash
          </DialogTitle>
          <DialogDescription>
            Deleted tasks can be restored or permanently removed.
          </DialogDescription>
        </DialogHeader>

        {deletedTasks.length > 0 && (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={actionId === 'all'}
                >
                  {actionId === 'all' ? (
                    <Loader2 className="size-4 animate-spin mr-1" />
                  ) : null}
                  Empty Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Empty trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {deletedTasks.length}{' '}
                    {deletedTasks.length === 1 ? 'task' : 'tasks'}. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmptyTrash}>
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && deletedTasks.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Trash is empty
            </p>
          )}

          {!loading &&
            deletedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        priorityColors[task.priority]
                      )}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Deleted{' '}
                      {new Date(task.deleted_at!).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => handleRestore(task.id)}
                    disabled={actionId === task.id}
                    title="Restore"
                  >
                    {actionId === task.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Undo2 className="size-4" />
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={actionId === task.id}
                        title="Delete permanently"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &ldquo;{task.title}&rdquo; will be permanently
                          deleted. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handlePermanentDelete(task.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

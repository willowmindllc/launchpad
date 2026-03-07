'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  updateTask,
  deleteTask,
  getTaskComments,
  createTaskComment,
  deleteTaskComment,
  getTaskActivity,
} from '@/lib/supabase/queries'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trash2, Send, Loader2, History, MessageSquare, Clock, Info, ExternalLink } from 'lucide-react'
import type { Task, TaskStatus, TaskPriority, TaskComment, TaskActivity, Profile, MemberRole } from '@/types/database'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_PRIORITY_LABELS,
} from '@/types/database'
import { cn } from '@/lib/utils'

export const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

type CommentWithUser = TaskComment & {
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

type ActivityWithUser = TaskActivity & {
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export const ACTION_LABELS: Record<string, string> = {
  title_changed: 'changed the title',
  status_changed: 'changed status',
  priority_changed: 'changed priority',
  description_changed: 'updated the description',
  trashed: 'moved to trash',
  restored: 'restored from trash',
}

export function linkifyContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex
      urlRegex.lastIndex = 0
      const isGitHub = part.includes('github.com')
      const label = isGitHub
        ? part.replace(/https?:\/\/github\.com\//, '').replace(/\/$/, '')
        : part
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
        >
          {isGitHub ? `github: ${label}` : label}
        </a>
      )
    }
    return part
  })
}

interface TaskDetailContentProps {
  task: TaskWithAssignee
  onUpdated: () => void
  onDeleted: (taskId: string) => void
  projectId: string
  userRole?: MemberRole
}

export function TaskDetailContent({
  task,
  onUpdated,
  onDeleted,
  projectId,
  userRole = 'owner',
}: TaskDetailContentProps) {
  const canEdit = userRole === 'owner' || userRole === 'admin'
  const canComment = userRole === 'owner' || userRole === 'admin' || userRole === 'member'
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const initializedTaskId = useRef<string>(task.id)

  // Comments state
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [activity, setActivity] = useState<ActivityWithUser[]>([])
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [supabase])

  // Sync local state when task prop changes
  if (task.id !== initializedTaskId.current) {
    initializedTaskId.current = task.id
    setTitle(task.title)
    setDescription(task.description || '')
  }

  // Fetch comments and activity when task changes
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [commentsData, activityData] = await Promise.all([
          getTaskComments(supabase, task.id),
          getTaskActivity(supabase, task.id).catch(() => [])
        ])
        if (!cancelled) {
          setComments(commentsData)
          setActivity(activityData as ActivityWithUser[])
        }
      } catch (err) {
        console.error('Failed to load comments:', err)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [task.id, supabase])

  // Scroll to bottom when new comment added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const saveField = useCallback(
    async (field: string, value: string | null) => {
      setSaving(true)
      try {
        await updateTask(supabase, task.id, { [field]: value })
        onUpdated()
      } catch (err) {
        console.error(`Failed to update ${field}:`, err)
      } finally {
        setSaving(false)
      }
    },
    [task, supabase, onUpdated]
  )

  // Check if title or description have unsaved changes
  const hasUnsavedChanges =
    title.trim() !== task.title ||
    (description.trim() || '') !== (task.description || '')

  const handleSaveChanges = useCallback(async () => {
    setSaving(true)
    try {
      const updates: Record<string, string | null> = {}
      if (title.trim() !== task.title) updates.title = title.trim()
      const newDesc = description.trim() || null
      if (newDesc !== (task.description || null)) updates.description = newDesc
      if (Object.keys(updates).length > 0) {
        await updateTask(supabase, task.id, updates)
        onUpdated()
      }
    } catch (err) {
      console.error('Failed to save changes:', err)
    } finally {
      setSaving(false)
    }
  }, [task, title, description, supabase, onUpdated])

  const handleDiscardChanges = useCallback(() => {
    setTitle(task.title)
    setDescription(task.description || '')
  }, [task])

  const handleStatusChange = useCallback(
    (value: string) => {
      saveField('status', value)
    },
    [saveField]
  )

  const handlePriorityChange = useCallback(
    (value: string) => {
      saveField('priority', value)
    },
    [saveField]
  )

  const handleDueDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null
      saveField('due_date', value)
    },
    [saveField]
  )

  const handleDelete = useCallback(async () => {
    try {
      await deleteTask(supabase, task.id)
      onDeleted(task.id)
    } catch (err) {
      console.error('Failed to move task to trash:', err)
    }
  }, [task, supabase, onDeleted])

  const handlePostComment = useCallback(async () => {
    if (!currentUserId || !commentText.trim()) return
    setPostingComment(true)
    try {
      const newComment = await createTaskComment(supabase, {
        task_id: task.id,
        user_id: currentUserId,
        content: commentText.trim(),
      })
      setComments((prev) => [...prev, newComment])
      setCommentText('')
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setPostingComment(false)
    }
  }, [task, currentUserId, commentText, supabase])

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteTaskComment(supabase, commentId)
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      } catch (err) {
        console.error('Failed to delete comment:', err)
      }
    },
    [supabase]
  )

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
          placeholder="Task title"
          readOnly={!canEdit}
        />
      </div>

      {/* Status & Priority row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={task.status}
            onValueChange={handleStatusChange}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select
            value={task.priority}
            onValueChange={handlePriorityChange}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(TASK_PRIORITY_LABELS) as [
                  TaskPriority,
                  string,
                ][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] pointer-events-none',
                      priorityColors[value]
                    )}
                  >
                    {label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due date */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Due Date</Label>
        <Input
          type="date"
          value={task.due_date || ''}
          onChange={handleDueDateChange}
          className="w-full"
          readOnly={!canEdit}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="min-h-[100px] resize-none"
          readOnly={!canEdit}
        />
      </div>

      {/* Save / Discard */}
      {hasUnsavedChanges && (
        <div className="flex gap-2">
          <Button
            onClick={handleSaveChanges}
            disabled={saving || !title.trim()}
            size="sm"
            className="flex-1"
          >
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
          <Button
            onClick={handleDiscardChanges}
            variant="outline"
            size="sm"
          >
            Discard
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Separator />
      <Tabs defaultValue="comments" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="comments" className="gap-1.5 text-xs">
            <MessageSquare className="size-3.5" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <Clock className="size-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5 text-xs">
            <Info className="size-3.5" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-3 mt-3">
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No comments yet</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="group flex gap-2 rounded-lg bg-muted/50 p-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {(comment.user.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">
                      {comment.user.full_name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(comment.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {linkifyContent(comment.content)}
                  </p>
                </div>
                {comment.user_id === currentUserId && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
          {canComment && (
            <form
              onSubmit={(e) => { e.preventDefault(); handlePostComment() }}
              className="flex gap-2"
            >
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 text-sm"
                disabled={postingComment}
              />
              <Button type="submit" size="icon" variant="ghost" disabled={postingComment || !commentText.trim()}>
                {postingComment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-3">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {activity.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No history yet</p>
            )}
            {activity.map((act) => (
              <div key={act.id} className="flex items-start gap-2 px-2.5 py-1.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                  <History className="size-3 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/70">
                      {act.user?.full_name || 'System'}
                    </span>
                    {' '}{ACTION_LABELS[act.action] || act.action}
                    {act.old_value && act.new_value && (
                      <>
                        {' from '}
                        <span className="line-through text-muted-foreground/60">{act.old_value}</span>
                        {' → '}
                        <span className="font-medium text-foreground/70">{act.new_value}</span>
                      </>
                    )}
                    {act.new_value && !act.old_value && act.action !== 'trashed' && act.action !== 'restored' && (
                      <> to <span className="font-medium text-foreground/70">{act.new_value}</span></>
                    )}
                    <span className="ml-2 text-[10px]">
                      {new Date(act.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-3 mt-3">
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <p>Created {new Date(task.created_at).toLocaleDateString()}</p>
            <p>Updated {new Date(task.updated_at).toLocaleDateString()}</p>
            {task.assignee && (
              <p>Assignee: {task.assignee.full_name || 'Unassigned'}</p>
            )}
            {task.github_issue_url && (
              <a
                href={task.github_issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="size-3" />
                GitHub Issue #{task.github_issue_number}
              </a>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Move to Trash */}
      {canEdit && (
        <div className="border-t border-border pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full gap-2">
                <Trash2 className="size-4" />
                Move to Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{task.title}&rdquo; will be moved to the trash. You
                  can restore it later from the trash view.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

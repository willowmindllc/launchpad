'use client'

import { useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Task, TaskPriority, TaskStatus, Profile } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '@/types/database'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

type TaskWithAssignee = Task & { assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null }

import { highlightMatch } from './task-search'

interface TaskCardLiveProps {
  task: TaskWithAssignee
  onMove: (taskId: string, newStatus: TaskStatus) => void
  onDelete: (taskId: string) => void
  onClick?: (task: TaskWithAssignee) => void
  isDragOverlay?: boolean
  readOnly?: boolean
  searchTerm?: string
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (taskId: string) => void
}

export function TaskCardLive({ task, onMove, onDelete, onClick, isDragOverlay, readOnly, searchTerm, selectionMode, selected, onToggleSelect }: TaskCardLiveProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragOverlay || readOnly || selectionMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const otherStatuses = TASK_STATUS_ORDER.filter(s => s !== task.status)

  const wasDragged = useRef(false)

  const handlePointerDown = useCallback(() => {
    wasDragged.current = false
  }, [])

  const handlePointerMove = useCallback(() => {
    wasDragged.current = true
  }, [])

  const handleClick = useCallback(() => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(task.id)
      return
    }
    if (!wasDragged.current && onClick) {
      onClick(task)
    }
  }, [onClick, task, selectionMode, onToggleSelect])

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(selectionMode ? {} : listeners)}
      aria-disabled={selectionMode ? undefined : attributes['aria-disabled']}
      onPointerDown={(e) => {
        handlePointerDown()
        // Call dnd-kit's listener too
        listeners?.onPointerDown?.(e)
      }}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      className={cn(
        'group cursor-grab border-border/50 transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 touch-none',
        isDragging && 'opacity-30',
        isDragOverlay && 'shadow-xl shadow-primary/10 border-primary/50',
        selectionMode && 'cursor-pointer',
        selected && 'bg-primary/10 border-primary'
      )}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          {selectionMode && (
            <div
              className="mt-0.5 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect?.(task.id)
              }}
            >
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-[4px] border-2 transition-colors cursor-pointer',
                  selected
                    ? 'bg-white border-white text-black'
                    : 'border-muted-foreground/40 bg-transparent'
                )}
              >
                {selected && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
          )}
          <h4 className="text-sm font-medium leading-tight flex-1">{searchTerm ? highlightMatch(task.title, searchTerm) : task.title}</h4>
          <div className="flex shrink-0 items-center gap-1">
            {task.github_issue_number && (
              <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border/50 font-mono">
                #{task.github_issue_number}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px]', priorityColors[task.priority])}>
              {task.priority}
            </Badge>
            {!isDragOverlay && !readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    ⋮
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {otherStatuses.map(status => (
                    <DropdownMenuItem key={status} onClick={() => onMove(task.id, status)}>
                      Move to {TASK_STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {task.description && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between">
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">
              📅 {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">
                {task.assignee.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

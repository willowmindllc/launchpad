'use client'

import { TaskCard } from './task-card'
import { CreateTaskDialog } from './create-task-dialog'
import type { Task, TaskStatus } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '@/types/database'
import { cn } from '@/lib/utils'

const columnColors: Record<TaskStatus, string> = {
  backlog: 'border-t-slate-500',
  in_progress: 'border-t-blue-500',
  review: 'border-t-amber-500',
  done: 'border-t-emerald-500',
}

interface KanbanBoardProps {
  tasks: Task[]
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const ticketNum = (title: string): number => {
    const match = title.match(/^[A-Z]+-(\d{3})/)
    return match ? parseInt(match[1], 10) : 9999
  }

  const tasksByStatus = TASK_STATUS_ORDER.reduce(
    (acc, status) => {
      const isBacklog = status === 'backlog'
      acc[status] = tasks.filter((t) => t.status === status).sort((a, b) => {
        const na = ticketNum(a.title)
        const nb = ticketNum(b.title)
        return isBacklog ? na - nb : nb - na
      })
      return acc
    },
    {} as Record<TaskStatus, Task[]>
  )

  return (
    <div className="flex gap-4 overflow-x-auto p-6">
      {TASK_STATUS_ORDER.map((status) => (
        <div
          key={status}
          className={cn(
            'flex min-w-[280px] flex-1 flex-col rounded-lg border border-border/50 border-t-2 bg-card/50',
            columnColors[status]
          )}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tasksByStatus[status].length}
              </span>
            </div>
            <CreateTaskDialog defaultStatus={status} />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {tasksByStatus[status].map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasksByStatus[status].length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

'use client'

import type { TaskStatus } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '@/types/database'
import { cn } from '@/lib/utils'

interface MobileColumnTabsProps {
  activeColumn: TaskStatus
  onColumnChange: (column: TaskStatus) => void
  taskCounts: Record<TaskStatus, number>
}

export function MobileColumnTabs({ activeColumn, onColumnChange, taskCounts }: MobileColumnTabsProps) {
  return (
    <div className="flex border-b border-border/50 bg-card/50 md:hidden">
      {TASK_STATUS_ORDER.map((status) => (
        <button
          key={status}
          onClick={() => onColumnChange(status)}
          className={cn(
            'flex-1 py-2.5 text-center text-xs font-medium transition-colors relative',
            activeColumn === status
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {TASK_STATUS_LABELS[status]}
          {taskCounts[status] > 0 && (
            <span className={cn(
              'ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px]',
              activeColumn === status ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {taskCounts[status]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

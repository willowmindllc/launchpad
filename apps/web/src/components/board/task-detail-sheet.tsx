'use client'

import { useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { TaskDetailContent, type TaskWithAssignee } from './task-detail-content'
import type { MemberRole } from '@/types/database'

interface TaskDetailSheetProps {
  task: TaskWithAssignee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onDeleted: (taskId: string) => void
  userRole?: MemberRole
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  userRole,
}: TaskDetailSheetProps) {
  const handleDeleted = useCallback(
    (taskId: string) => {
      onOpenChange(false)
      onDeleted(taskId)
    },
    [onOpenChange, onDeleted]
  )

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Edit Task</SheetTitle>
          <SheetDescription className="sr-only">
            Edit task details
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8">
          <TaskDetailContent
            task={task}
            onUpdated={onUpdated}
            onDeleted={handleDeleted}
            projectId={task.project_id}
            userRole={userRole}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

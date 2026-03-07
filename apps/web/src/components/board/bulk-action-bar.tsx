'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowRight, Flag, Trash2, X } from 'lucide-react'
import type { TaskStatus, TaskPriority } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS } from '@/types/database'
import { cn } from '@/lib/utils'

const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

interface BulkActionBarProps {
  selectedCount: number
  onMoveToColumn: (status: TaskStatus) => void
  onChangePriority: (priority: TaskPriority) => void
  onDelete: () => void
  onClearSelection: () => void
}

export function BulkActionBar({
  selectedCount,
  onMoveToColumn,
  onChangePriority,
  onDelete,
  onClearSelection,
}: BulkActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  if (selectedCount === 0) return null

  return (
    <>
      <div
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-2 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg px-4 py-3',
          'animate-in slide-in-from-bottom-4 fade-in duration-200'
        )}
      >
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="h-4 w-px bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowRight className="size-3.5" />
              Move to
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {TASK_STATUS_ORDER.map((status) => (
              <DropdownMenuItem key={status} onClick={() => onMoveToColumn(status)}>
                {TASK_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Flag className="size-3.5" />
              Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {PRIORITY_ORDER.map((priority) => (
              <DropdownMenuItem key={priority} onClick={() => onChangePriority(priority)}>
                {TASK_PRIORITY_LABELS[priority]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClearSelection}>
          <X className="size-3.5" />
          Clear
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount === 1 ? 'This task' : 'These tasks'} will be moved to trash. You can restore {selectedCount === 1 ? 'it' : 'them'} later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete()
                setDeleteDialogOpen(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

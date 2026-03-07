'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { moveTask, deleteTask, getDeletedTasks, getTasks, bulkMoveTasks, bulkUpdatePriority, bulkDeleteTasks } from '@/lib/supabase/queries'
import { TaskCardLive } from './task-card-live'
import { CreateTaskDialog } from './create-task-dialog-live'
import { AiSuggestDialog } from './ai-suggest-dialog'
import { ChatToBoard } from './chat-to-board'
import { TrashView } from './trash-view'
import { BulkActionBar } from './bulk-action-bar'
import { Button } from '@/components/ui/button'
import { CheckSquare, Download, Keyboard } from 'lucide-react'
import { exportTasksCsv } from '@/lib/export-csv'
import { TaskSearch, filterTasks, highlightMatch } from './task-search'
import type { TaskFilters } from './task-search'
import { MobileColumnTabs } from './mobile-column-tabs'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import type { Task, TaskStatus, TaskPriority, Profile, MemberRole } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '@/types/database'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'

const columnColors: Record<TaskStatus, string> = {
  backlog: 'border-t-slate-500',
  in_progress: 'border-t-blue-500',
  review: 'border-t-amber-500',
  done: 'border-t-emerald-500',
}

type TaskWithAssignee = Task & { assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null }

interface KanbanBoardLiveProps {
  tasks: TaskWithAssignee[]
  projectId: string
  projectName: string
  projectDescription: string | null
  userRole?: MemberRole
}

function DroppableColumn({
  status,
  children,
}: {
  status: TaskStatus
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 space-y-2 overflow-y-auto p-2 transition-colors rounded-b-lg min-h-[80px]',
        isOver && 'bg-primary/5'
      )}
    >
      {children}
    </div>
  )
}

export function KanbanBoardLive({ tasks: initialTasks, projectId, projectName, projectDescription, userRole = 'owner' }: KanbanBoardLiveProps) {
  const canEdit = userRole === 'owner' || userRole === 'admin'
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashCount, setTrashCount] = useState(0)
  const [filters, setFilters] = useState<TaskFilters>({ search: '', priorities: [] })
  const [mobileColumn, setMobileColumn] = useState<TaskStatus>('backlog')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useKeyboardShortcuts({
    onFocusSearch: () => window.dispatchEvent(new Event('launchpad:focus-search')),
    onOpenCreateTask: canEdit ? () => setCreateOpen(true) : undefined,
    onOpenShortcutsDialog: () => setShortcutsOpen(true),
    onSwitchColumn: setMobileColumn,
  })
  const router = useRouter()
  const supabase = createClient()
  const tasksBeforeDrag = useRef<TaskWithAssignee[]>(tasks)

  // Fetch trash count and broadcast to sidebar
  const refreshTrashCount = useCallback(async () => {
    try {
      const deleted = await getDeletedTasks(supabase, projectId)
      setTrashCount(deleted.length)
      window.dispatchEvent(new CustomEvent('launchpad:trash-count', { detail: deleted.length }))
    } catch {
      // silently fail — non-critical
    }
  }, [supabase, projectId])

  useEffect(() => {
    refreshTrashCount()
  }, [refreshTrashCount])

  // Escape exits selection mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false)
        setSelectedIds(new Set())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectionMode])

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const handleBulkMove = useCallback(async (status: TaskStatus) => {
    const ids = Array.from(selectedIds)
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, status } : t))
    try {
      await bulkMoveTasks(supabase, ids, status)
      router.refresh()
    } catch (err) {
      console.error('Bulk move failed:', err)
      setTasks(initialTasks)
    }
    clearSelection()
  }, [selectedIds, supabase, router, initialTasks, clearSelection])

  const handleBulkPriority = useCallback(async (priority: TaskPriority) => {
    const ids = Array.from(selectedIds)
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, priority } : t))
    try {
      await bulkUpdatePriority(supabase, ids, priority)
      router.refresh()
    } catch (err) {
      console.error('Bulk priority change failed:', err)
      setTasks(initialTasks)
    }
    clearSelection()
  }, [selectedIds, supabase, router, initialTasks, clearSelection])

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)))
    try {
      await bulkDeleteTasks(supabase, ids)
      refreshTrashCount()
      router.refresh()
    } catch (err) {
      console.error('Bulk delete failed:', err)
      setTasks(initialTasks)
    }
    clearSelection()
  }, [selectedIds, supabase, router, initialTasks, clearSelection, refreshTrashCount])

  // Listen for trash open from sidebar
  useEffect(() => {
    const handler = () => setTrashOpen(true)
    window.addEventListener('launchpad:open-trash', handler)
    return () => window.removeEventListener('launchpad:open-trash', handler)
  }, [])

  const editSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )
  const noSensors = useSensors()
  const sensors = canEdit ? editSensors : noSensors

  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])
  const hasActiveFilters = filters.search.length > 0 || filters.priorities.length > 0
  const searchTerm = filters.search

  const tasksByStatus = useMemo(() => {
    // Extract ticket number from title (e.g. "MY-024: ..." → 24)
    const ticketNum = (title: string): number => {
      const match = title.match(/^[A-Z]+-(\d{3})/)
      return match ? parseInt(match[1], 10) : 9999
    }

    return TASK_STATUS_ORDER.reduce(
      (acc, status) => {
        const isBacklog = status === 'backlog'
        acc[status] = filteredTasks
          .filter((t) => t.status === status)
          .sort((a, b) => {
            const na = ticketNum(a.title)
            const nb = ticketNum(b.title)
            return isBacklog ? na - nb : nb - na
          })
        return acc
      },
      {} as Record<TaskStatus, TaskWithAssignee[]>
    )
  }, [filteredTasks])

  const mobileTaskCounts = useMemo(() => {
    return TASK_STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = tasksByStatus[status].length
        return acc
      },
      {} as Record<TaskStatus, number>
    )
  }, [tasksByStatus])

  const taskIdsByStatus = useMemo(() => {
    return TASK_STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = tasksByStatus[status].map((t) => t.id)
        return acc
      },
      {} as Record<TaskStatus, string[]>
    )
  }, [tasksByStatus])

  const findTaskColumn = useCallback(
    (taskId: string): TaskStatus | undefined => {
      return tasks.find((t) => t.id === taskId)?.status
    },
    [tasks]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id)
      if (task) {
        setActiveTask(task)
        tasksBeforeDrag.current = tasks
      }
    },
    [tasks]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeColumn = findTaskColumn(activeId)
      if (!activeColumn) return

      // Determine the target column: either a column droppable or the column of the task being hovered
      const isOverColumn = TASK_STATUS_ORDER.includes(overId as TaskStatus)
      const overColumn: TaskStatus | undefined = isOverColumn
        ? (overId as TaskStatus)
        : findTaskColumn(overId)

      if (!overColumn || activeColumn === overColumn) return

      // Move the task to the new column (append at end during drag-over)
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== activeId) return t
          const targetTasks = prev.filter((pt) => pt.status === overColumn && pt.id !== activeId)
          return { ...t, status: overColumn, position: targetTasks.length }
        })
        return updated
      })
    },
    [findTaskColumn]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTask(null)

      if (!over) {
        setTasks(tasksBeforeDrag.current)
        return
      }

      const activeId = active.id as string
      const overId = over.id as string

      const activeColumn = findTaskColumn(activeId)
      if (!activeColumn) return

      // Calculate the new position based on drop target
      const columnTasks = tasks
        .filter((t) => t.status === activeColumn)
        .sort((a, b) => a.position - b.position)

      let newPosition: number
      const isOverColumn = TASK_STATUS_ORDER.includes(overId as TaskStatus)

      if (isOverColumn) {
        // Dropped directly on a column droppable — put at end
        newPosition = columnTasks.filter((t) => t.id !== activeId).length
      } else {
        // Dropped on another task — find the index of the target task
        const overIndex = columnTasks.findIndex((t) => t.id === overId)
        const activeIndex = columnTasks.findIndex((t) => t.id === activeId)

        if (overIndex === -1) {
          newPosition = columnTasks.filter((t) => t.id !== activeId).length
        } else if (activeIndex === -1) {
          // Coming from another column
          newPosition = overIndex
        } else {
          // Same column reorder
          newPosition = overIndex
        }
      }

      // Optimistic update: recompute positions for the entire column
      setTasks((prev) => {
        const otherColumnTasks = prev.filter((t) => t.status !== activeColumn)
        const thisColumnTasks = prev
          .filter((t) => t.status === activeColumn && t.id !== activeId)
          .sort((a, b) => a.position - b.position)

        const draggedTask = prev.find((t) => t.id === activeId)
        if (!draggedTask) return prev

        // Insert at new position
        const clampedPos = Math.max(0, Math.min(newPosition, thisColumnTasks.length))
        thisColumnTasks.splice(clampedPos, 0, { ...draggedTask, status: activeColumn })

        // Reassign positions
        const reindexed = thisColumnTasks.map((t, i) => ({ ...t, position: i }))

        return [...otherColumnTasks, ...reindexed]
      })

      // Persist to DB
      try {
        await moveTask(supabase, activeId, activeColumn, newPosition)
        router.refresh()
      } catch (err) {
        console.error('Failed to move task:', err)
        setTasks(tasksBeforeDrag.current)
      }
    },
    [findTaskColumn, tasks, supabase, router]
  )

  const handleMoveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
      try {
        const targetTasks = tasks.filter((t) => t.status === newStatus)
        const newPosition = targetTasks.length
        await moveTask(supabase, taskId, newStatus, newPosition)
        router.refresh()
      } catch (err) {
        console.error('Failed to move task:', err)
        setTasks(initialTasks)
      }
    },
    [supabase, tasks, initialTasks, router]
  )

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      try {
        await deleteTask(supabase, taskId)
        refreshTrashCount()
        router.refresh()
      } catch (err) {
        console.error('Failed to delete task:', err)
        setTasks(initialTasks)
      }
    },
    [supabase, initialTasks, router, refreshTrashCount]
  )

  const refreshTasks = useCallback(async () => {
    try {
      const freshTasks = await getTasks(supabase, projectId)
      setTasks(freshTasks)
    } catch {
      router.refresh()
    }
  }, [supabase, projectId, router])

  const handleTaskCreated = useCallback(() => {
    refreshTasks()
  }, [refreshTasks])

  const handleTaskClick = useCallback((task: TaskWithAssignee) => {
    router.push(`/projects/${projectId}/task/${task.id}`)
  }, [router, projectId])

  const handleTrashRestored = useCallback(() => {
    refreshTrashCount()
    refreshTasks()
  }, [refreshTrashCount, refreshTasks])

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pt-4 md:px-6">
        <TaskSearch onFiltersChange={setFilters} />
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="size-4" />
        </Button>
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">
            {filteredTasks.length} of {tasks.length} tasks
          </span>
        )}
        {canEdit && (
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => {
              if (selectionMode) clearSelection()
              else setSelectionMode(true)
            }}
          >
            <CheckSquare className="size-4" />
            {selectionMode ? 'Exit Select' : 'Select'}
          </Button>
        )}
        {canEdit && (
          <AiSuggestDialog
            projectId={projectId}
            projectName={projectName}
            projectDescription={projectDescription}
            onTasksAdded={handleTaskCreated}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => exportTasksCsv(tasks, projectName)}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
        {canEdit && (
          <ChatToBoard
            projectId={projectId}
            projectName={projectName}
            onTasksAdded={handleTaskCreated}
          />
        )}
      </div>
      {/* Mobile column tabs */}
      <MobileColumnTabs
        activeColumn={mobileColumn}
        onColumnChange={setMobileColumn}
        taskCounts={mobileTaskCounts}
      />

      <div className="flex gap-4 overflow-x-auto p-4 md:p-6 h-[calc(100vh-280px)] md:h-[calc(100vh-180px)]">
        {TASK_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={cn(
              'flex-1 flex-col rounded-lg border border-border/50 border-t-2 bg-card/50 max-h-full',
              'hidden md:flex md:min-w-[280px]',
              columnColors[status],
              status === mobileColumn && 'flex min-w-full md:min-w-[280px]',
            )}
          >
            <div className="hidden md:flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {tasksByStatus[status].length}
                </span>
              </div>
              {canEdit && <CreateTaskDialog defaultStatus={status} projectId={projectId} onCreated={handleTaskCreated} />}
            </div>
            {/* Mobile header with create button */}
            <div className="flex md:hidden items-center justify-between px-3 py-2">
              {canEdit && <CreateTaskDialog defaultStatus={status} projectId={projectId} onCreated={handleTaskCreated} />}
            </div>
            <SortableContext items={taskIdsByStatus[status]} strategy={verticalListSortingStrategy}>
              <DroppableColumn status={status}>
                {tasksByStatus[status].map((task) => (
                  <TaskCardLive
                    key={task.id}
                    task={task}
                    onMove={handleMoveTask}
                    onDelete={handleDeleteTask}
                    onClick={handleTaskClick}
                    readOnly={!canEdit}
                    searchTerm={searchTerm}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(task.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
                {tasksByStatus[status].length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {hasActiveFilters ? 'No matching tasks' : 'No tasks'}
                  </p>
                )}
              </DroppableColumn>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeTask ? (
          <div className="w-[280px] rotate-2 opacity-90">
            <TaskCardLive
              task={activeTask}
              onMove={handleMoveTask}
              onDelete={handleDeleteTask}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>

    <TrashView
      projectId={projectId}
      open={trashOpen}
      onOpenChange={setTrashOpen}
      onRestored={handleTrashRestored}
    />

    <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

    {canEdit && (
      <CreateTaskDialog
        projectId={projectId}
        onCreated={handleTaskCreated}
        externalOpen={createOpen}
        onExternalOpenChange={setCreateOpen}
      />
    )}

    {selectionMode && (
      <BulkActionBar
        selectedCount={selectedIds.size}
        onMoveToColumn={handleBulkMove}
        onChangePriority={handleBulkPriority}
        onDelete={handleBulkDelete}
        onClearSelection={clearSelection}
      />
    )}
    </>
  )
}

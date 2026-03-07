'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { TaskPriority } from '@/types/database'
import { TASK_PRIORITY_LABELS } from '@/types/database'

export interface TaskFilters {
  search: string
  priorities: TaskPriority[]
}

const EMPTY_FILTERS: TaskFilters = { search: '', priorities: [] }

interface TaskSearchProps {
  onFiltersChange: (filters: TaskFilters) => void
}

export function TaskSearch({ onFiltersChange }: TaskSearchProps) {
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasFilters = filters.search || filters.priorities.length > 0

  const updateFilters = useCallback((update: Partial<TaskFilters>) => {
    setFilters(prev => {
      const next = { ...prev, ...update }
      onFiltersChange(next)
      return next
    })
  }, [onFiltersChange])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    onFiltersChange(EMPTY_FILTERS)
  }, [onFiltersChange])

  const togglePriority = useCallback((p: TaskPriority) => {
    setFilters(prev => {
      const has = prev.priorities.includes(p)
      const priorities = has ? prev.priorities.filter(x => x !== p) : [...prev.priorities, p]
      const next = { ...prev, priorities }
      onFiltersChange(next)
      return next
    })
  }, [onFiltersChange])

  // Listen for global focus-search event (fired by useKeyboardShortcuts)
  useEffect(() => {
    const handler = () => inputRef.current?.focus()
    window.addEventListener('launchpad:focus-search', handler)
    return () => window.removeEventListener('launchpad:focus-search', handler)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search tasks... ( / )"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-9 h-9 text-sm"
        />
        {filters.search && (
          <button
            onClick={() => updateFilters({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <SlidersHorizontal className="size-3.5" />
            Filter
            {filters.priorities.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                {filters.priorities.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([value, label]) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filters.priorities.includes(value)}
              onCheckedChange={() => togglePriority(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearFilters}>
          Clear
        </Button>
      )}
    </div>
  )
}

/** Filter tasks based on search and priority filters */
export function filterTasks<T extends { title: string; description: string | null; priority: string }>(
  tasks: T[],
  filters: TaskFilters
): T[] {
  let result = tasks

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    )
  }

  if (filters.priorities.length > 0) {
    result = result.filter(t => filters.priorities.includes(t.priority as TaskPriority))
  }

  return result
}

/** Highlight matching text in a string */
export function highlightMatch(text: string, search: string): React.ReactNode {
  if (!search) return text
  const idx = text.toLowerCase().indexOf(search.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200/80 dark:bg-yellow-500/30 rounded-sm px-0.5">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  )
}

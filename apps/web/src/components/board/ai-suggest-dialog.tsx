'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTask } from '@/lib/supabase/queries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Loader2, Pencil, Trash2, AlertCircle } from 'lucide-react'
import type { TaskPriority } from '@/types/database'
import { TASK_PRIORITY_LABELS } from '@/types/database'

interface TaskSuggestion {
  title: string
  description: string
  priority: TaskPriority
}

interface AiSuggestDialogProps {
  projectId: string
  projectName: string
  projectDescription: string | null
  onTasksAdded: () => void
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function AiSuggestDialog({
  projectId,
  projectName,
  projectDescription,
  onTasksAdded,
}: AiSuggestDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const supabase = createClient()

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuggestions([])
    setSelected(new Set())

    try {
      const res = await fetch('/api/ai/suggest-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectDescription,
        }),
      })

      const data = await res.json()

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setSelected(new Set(data.suggestions.map((_: TaskSuggestion, i: number) => i)))
        if (data.error) {
          setError(data.error)
        }
      } else {
        setError(data.error || 'No suggestions returned')
      }
    } catch {
      setError('Failed to connect to AI service. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [projectName, projectDescription])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && suggestions.length === 0) {
      fetchSuggestions()
    }
  }

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const updateSuggestion = (index: number, updates: Partial<TaskSuggestion>) => {
    setSuggestions((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  const removeSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index))
    setSelected((prev) => {
      const next = new Set<number>()
      prev.forEach((i) => {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      })
      return next
    })
    setEditingIndex(null)
  }

  const handleAddSelected = async () => {
    const tasksToAdd = suggestions.filter((_, i) => selected.has(i))
    if (tasksToAdd.length === 0) return

    setAdding(true)
    try {
      for (const task of tasksToAdd) {
        await createTask(supabase, {
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'backlog',
          project_id: projectId,
        })
      }
      setOpen(false)
      setSuggestions([])
      setSelected(new Set())
      onTasksAdded()
    } catch {
      setError('Failed to create some tasks. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const selectedCount = selected.size

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="size-4" />
          Generate Tasks with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-400" />
            AI Task Suggestions
          </DialogTitle>
          <DialogDescription>
            AI-generated task breakdown for <span className="font-medium text-foreground">{projectName}</span>.
            Review, edit, or remove suggestions before adding them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating task suggestions...</p>
            </div>
          )}

          {error && !loading && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchSuggestions}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className="space-y-2">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400 mb-3">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-card"
                >
                  <Checkbox
                    checked={selected.has(index)}
                    onCheckedChange={() => toggleSelected(index)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <Input
                          value={suggestion.title}
                          onChange={(e) => updateSuggestion(index, { title: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <Input
                          value={suggestion.description}
                          onChange={(e) => updateSuggestion(index, { description: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Select
                            value={suggestion.priority}
                            onValueChange={(v) => updateSuggestion(index, { priority: v as TaskPriority })}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setEditingIndex(null)}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-tight">{suggestion.title}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${priorityColors[suggestion.priority]}`}
                          >
                            {TASK_PRIORITY_LABELS[suggestion.priority]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {suggestion.description}
                        </p>
                      </>
                    )}
                  </div>
                  {editingIndex !== index && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingIndex(index)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="size-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSuggestion(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && suggestions.length > 0 && (
          <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {selectedCount} of {suggestions.length} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={adding}>
                Regenerate
              </Button>
              <Button
                size="sm"
                onClick={handleAddSelected}
                disabled={selectedCount === 0 || adding}
                className="gap-2"
              >
                {adding ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${selectedCount} Task${selectedCount !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

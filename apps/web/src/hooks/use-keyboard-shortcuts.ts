'use client'

import { useEffect, useCallback } from 'react'
import type { TaskStatus } from '@/types/database'
import { TASK_STATUS_ORDER } from '@/types/database'

interface KeyboardShortcutsOptions {
  onOpenCreateTask?: () => void
  onOpenShortcutsDialog?: () => void
  onFocusSearch?: () => void
  onSwitchColumn?: (column: TaskStatus) => void
}

function isTyping(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((e.target as HTMLElement)?.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts({
  onOpenCreateTask,
  onOpenShortcutsDialog,
  onFocusSearch,
  onSwitchColumn,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs
      if (isTyping(e)) return

      // Don't fire when modifier keys are held (allow browser/OS shortcuts)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case '/':
          e.preventDefault()
          onFocusSearch?.()
          break
        case 'n':
          e.preventDefault()
          onOpenCreateTask?.()
          break
        case '?':
          e.preventDefault()
          onOpenShortcutsDialog?.()
          break
        case '1':
        case '2':
        case '3':
        case '4': {
          const index = parseInt(e.key) - 1
          const column = TASK_STATUS_ORDER[index]
          if (column) {
            e.preventDefault()
            onSwitchColumn?.(column)
          }
          break
        }
      }
    },
    [onOpenCreateTask, onOpenShortcutsDialog, onFocusSearch, onSwitchColumn]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const KEYBOARD_SHORTCUTS = [
  { key: '/', description: 'Focus search bar' },
  { key: 'n', description: 'Create new task' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close dialog' },
  { key: '1', description: 'Switch to Backlog (mobile)' },
  { key: '2', description: 'Switch to In Progress (mobile)' },
  { key: '3', description: 'Switch to Review (mobile)' },
  { key: '4', description: 'Switch to Done (mobile)' },
] as const

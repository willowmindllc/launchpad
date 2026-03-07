'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KEYBOARD_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 pt-2">
          {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="contents">
              <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border border-border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
                {key}
              </kbd>
              <span className="flex items-center text-sm text-foreground">
                {description}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

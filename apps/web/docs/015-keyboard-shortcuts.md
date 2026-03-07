# LP-035: Keyboard Shortcuts

## Overview

Power-user keyboard shortcuts for the Kanban board, allowing fast navigation and task creation without reaching for the mouse.

## Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus the search bar |
| `n` | Open the Create Task dialog |
| `Esc` | Close any open dialog |
| `?` | Show keyboard shortcuts help |
| `1` | Switch to Backlog column (mobile) |
| `2` | Switch to In Progress column (mobile) |
| `3` | Switch to Review column (mobile) |
| `4` | Switch to Done column (mobile) |

## Architecture

### Hook: `src/hooks/use-keyboard-shortcuts.ts`

- `useKeyboardShortcuts(options)` - registers global `keydown` listeners
- Ignores keypresses when the user is typing in an `<input>`, `<textarea>`, `<select>`, or `contentEditable` element
- Ignores keypresses with modifier keys (Ctrl/Cmd/Alt) to avoid conflicting with browser shortcuts
- Exports `KEYBOARD_SHORTCUTS` array used by the help dialog

### Dialog: `src/components/board/keyboard-shortcuts-dialog.tsx`

- `KeyboardShortcutsDialog` - shadcn Dialog showing a grid of shortcut keys and descriptions
- Opened via `?` key or the keyboard icon button in the toolbar

### Integration: `src/components/board/kanban-board-live.tsx`

- Hook wired up with callbacks for search focus, create task, shortcuts dialog, and mobile column switching
- Keyboard icon button added to the board toolbar next to the search bar
- Search focus uses a `launchpad:focus-search` custom event (same pattern as trash)
- Create Task dialog supports external open state via `externalOpen` / `onExternalOpenChange` props

## Safety

Shortcuts only fire when no input element is focused, preventing interference with text entry. Escape handling is provided natively by shadcn/Radix dialogs.

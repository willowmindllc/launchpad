'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { TrashView } from '@/components/board/trash-view'
import { createClient } from '@/lib/supabase/client'
import { getAllDeletedTasksCount } from '@/lib/supabase/queries'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trashCount, setTrashCount] = useState(0)
  const [trashOpen, setTrashOpen] = useState(false)
  const supabase = createClient()

  // Fetch global trash count on mount
  useEffect(() => {
    getAllDeletedTasksCount(supabase).then(setTrashCount).catch(() => {})
  }, [supabase])

  // Listen for trash count updates from kanban board (overrides global count)
  useEffect(() => {
    const handler = (e: CustomEvent) => setTrashCount(e.detail ?? 0)
    window.addEventListener('launchpad:trash-count', handler as EventListener)
    return () => window.removeEventListener('launchpad:trash-count', handler as EventListener)
  }, [])

  const handleTrashClick = useCallback(() => {
    // Dispatch event — if a board page is listening, it handles its own trash
    const event = new CustomEvent('launchpad:open-trash', { cancelable: true })
    const handled = !window.dispatchEvent(event)
    // If no board page handled it (event wasn't cancelled), open global trash
    if (!handled) {
      setTrashOpen(true)
    }
  }, [])

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-2 border-b border-border/50 bg-card px-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-xl">🚀</span>
        <span className="text-lg font-bold">LaunchPad</span>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavClick={() => setSidebarOpen(false)} onTrashClick={handleTrashClick} trashCount={trashCount} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>

      {/* Global trash dialog (for non-board pages) */}
      <TrashView
        open={trashOpen}
        onOpenChange={(open) => {
          setTrashOpen(open)
          if (!open) {
            // Refresh count when dialog closes
            getAllDeletedTasksCount(supabase).then(setTrashCount).catch(() => {})
          }
        }}
        onRestored={() => {
          getAllDeletedTasksCount(supabase).then(setTrashCount).catch(() => {})
        }}
      />
    </div>
  )
}

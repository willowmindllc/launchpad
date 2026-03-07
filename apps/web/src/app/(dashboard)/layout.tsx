'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trashCount, setTrashCount] = useState(0)

  // Listen for trash count updates from kanban board
  useEffect(() => {
    const handler = (e: CustomEvent) => setTrashCount(e.detail ?? 0)
    window.addEventListener('launchpad:trash-count', handler as EventListener)
    return () => window.removeEventListener('launchpad:trash-count', handler as EventListener)
  }, [])

  const handleTrashClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('launchpad:open-trash'))
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
    </div>
  )
}

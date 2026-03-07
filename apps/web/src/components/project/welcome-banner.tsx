'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function WelcomeBanner({ projectId }: { projectId: string }) {
  const [visible, setVisible] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Clean the URL param immediately
    router.replace(`/projects/${projectId}`, { scroll: false })

    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [projectId, router])

  if (!visible) return null

  return (
    <div className="mx-4 md:mx-6 mt-2 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-sm font-medium text-emerald-400">
        Welcome! You joined this project.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="ml-4 text-emerald-400/60 hover:text-emerald-400 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  )
}

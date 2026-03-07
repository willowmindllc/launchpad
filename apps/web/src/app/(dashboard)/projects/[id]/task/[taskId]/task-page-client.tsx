'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskDetailContent, type TaskWithAssignee } from '@/components/board/task-detail-content'
import type { MemberRole } from '@/types/database'

interface TaskPageClientProps {
  task: TaskWithAssignee
  projectId: string
  projectName: string
  userRole?: MemberRole
}

export function TaskPageClient({ task, projectId, projectName, userRole }: TaskPageClientProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleBack = useCallback(() => {
    router.push(`/projects/${projectId}`)
  }, [router, projectId])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleUpdated = useCallback(() => {
    router.refresh()
  }, [router])

  const handleDeleted = useCallback(() => {
    router.push(`/projects/${projectId}`)
  }, [router, projectId])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="size-4" />
            {projectName}
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
            {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
        <TaskDetailContent
          task={task}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          projectId={projectId}
          userRole={userRole}
        />
      </div>
    </div>
  )
}

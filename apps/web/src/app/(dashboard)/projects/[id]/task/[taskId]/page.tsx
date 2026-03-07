import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getProject, getTask, getProjectMemberRole } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { TaskPageClient } from './task-page-client'

interface TaskPageProps {
  params: Promise<{ id: string; taskId: string }>
}

export async function generateMetadata({ params }: TaskPageProps): Promise<Metadata> {
  const { id, taskId } = await params
  const supabase = await createClient()

  try {
    const [project, task] = await Promise.all([
      getProject(supabase, id),
      getTask(supabase, taskId),
    ])
    if (task.project_id !== id) return { title: 'Not Found' }

    const title = `${task.title} | ${project.name} — LaunchPad`
    return {
      title,
      openGraph: {
        title,
        description: task.description || `Task in ${project.name}`,
      },
    }
  } catch {
    return { title: 'Not Found' }
  }
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { id, taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let project
  try {
    project = await getProject(supabase, id)
  } catch {
    notFound()
  }

  let task
  try {
    task = await getTask(supabase, taskId)
  } catch {
    notFound()
  }

  // Cross-project mismatch → 404
  if (task.project_id !== id) notFound()

  const memberRole = await getProjectMemberRole(supabase, id, user.id)
  const userRole = memberRole ?? (project.owner_id === user.id ? 'owner' as const : 'viewer' as const)

  return (
    <div className="flex h-full flex-col">
      <Header title={project.name} description={project.description || undefined} />
      <TaskPageClient task={task} projectId={id} projectName={project.name} userRole={userRole} />
    </div>
  )
}

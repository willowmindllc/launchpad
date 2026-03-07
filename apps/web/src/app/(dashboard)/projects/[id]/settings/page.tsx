import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { ProjectSettings } from '@/components/project/project-settings'

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let project
  try {
    project = await getProject(supabase, id)
  } catch {
    notFound()
  }

  if (project.owner_id !== user.id) {
    redirect(`/projects/${id}`)
  }

  return (
    <div>
      <Header title="Project Settings" description={project.name} />
      <ProjectSettings project={project} />
    </div>
  )
}

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectMemberRole } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { ProjectSettings } from '@/components/project/project-settings'
import { AgentTokensSettings } from '@/components/project/agent-tokens-settings'

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

  // Allow owner and admin access to settings
  const role = await getProjectMemberRole(supabase, id, user.id)
  const isOwner = project.owner_id === user.id
  const isAdmin = role === 'admin'

  if (!isOwner && !isAdmin) {
    redirect(`/projects/${id}`)
  }

  return (
    <div>
      <Header title="Project Settings" description={project.name} />
      <ProjectSettings project={project} />
      <div className="px-6 max-w-2xl pb-6">
        <AgentTokensSettings projectId={project.id} />
      </div>
    </div>
  )
}

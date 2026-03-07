import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, getSharedProjects, getArchivedProjects } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { ProjectList } from '@/components/projects/project-list'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [projects, sharedProjects, archivedProjects] = await Promise.all([
    getProjects(supabase),
    getSharedProjects(supabase, user.id),
    getArchivedProjects(supabase),
  ])

  return (
    <div>
      <Header title="Projects" description="Manage your projects" />
      <ProjectList projects={projects} sharedProjects={sharedProjects} archivedProjects={archivedProjects} userId={user.id} />
    </div>
  )
}

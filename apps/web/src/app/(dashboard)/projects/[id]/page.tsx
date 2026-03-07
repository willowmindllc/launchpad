import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProject, getTasks, getProjectMemberRole } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { KanbanBoardLive } from '@/components/board/kanban-board-live'
import { GitHubLink } from '@/components/project/github-link'
import { ShareDialog } from '@/components/project/share-dialog'
import { WelcomeBanner } from '@/components/project/welcome-banner'

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ welcome?: string }>
}) {
  const { id } = await params
  const { welcome } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let project
  try {
    project = await getProject(supabase, id)
  } catch {
    notFound()
  }

  const [tasks, memberRole] = await Promise.all([
    getTasks(supabase, id),
    getProjectMemberRole(supabase, id, user.id),
  ])

  // Fallback: project owner always has owner role
  const userRole = memberRole ?? (project.owner_id === user.id ? 'owner' as const : 'viewer' as const)
  const canManageSharing = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="flex h-full flex-col">
      <Header
        title={project.name}
        description={project.description || undefined}
        action={
          <div className="flex items-center gap-2">
            {canManageSharing && <ShareDialog projectId={id} currentUserRole={userRole} />}
            {userRole === 'owner' && (
              <Link
                href={`/projects/${id}/settings`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
                title="Project Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </Link>
            )}
          </div>
        }
      />
      {welcome === 'true' && <WelcomeBanner projectId={id} />}
      <div className="px-4 md:px-6 pt-2">
        <GitHubLink projectId={id} />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoardLive tasks={tasks} projectId={id} projectName={project.name} projectDescription={project.description} userRole={userRole} />
      </div>
    </div>
  )
}

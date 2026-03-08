import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project, Task, TaskStatus, TaskPriority, Profile, TaskComment, TaskActivity, MemberRole, ProjectInvite, ProjectMember } from '@/types/database'

// ── Profiles ──

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(supabase: SupabaseClient, userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

// ── Projects ──

export async function getProjects(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('projects')
    .select('*, tasks(id, status, deleted_at)')
    .eq('archived', false)
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map(({ tasks, ...project }) => {
    const active = (tasks ?? []).filter((t: { deleted_at: string | null }) => !t.deleted_at)
    return {
      ...project,
      taskProgress: {
        done: active.filter((t: { status: string }) => t.status === 'done').length,
        total: active.length,
      },
    }
  }) as (Project & { taskProgress: { done: number; total: number } })[]
}

export async function getProject(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Project
}

export async function createProject(supabase: SupabaseClient, project: { name: string; description?: string; owner_id: string }) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function updateProject(supabase: SupabaseClient, id: string, updates: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function archiveProject(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function restoreProject(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function getArchivedProjects(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', true)
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Project[]
}

// ── Tasks ──

export async function getTasks(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position', { ascending: true })
  if (error) throw error
  return data as (Task & { assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null })[]
}

export async function getTask(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)')
    .eq('id', taskId)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data as Task & { assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null }
}

export async function createTask(supabase: SupabaseClient, task: {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  project_id: string
  assignee_id?: string
  due_date?: string
}) {
  // Auto-number: use project.ticket_prefix if set, otherwise detect from existing tasks
  const prefixPattern = /^([A-Z]+-)\d{3}/
  let finalTitle = task.title

  // Skip auto-numbering if user already included a prefix
  if (!prefixPattern.test(task.title)) {
    // Try to get ticket_prefix from project
    const { data: project } = await supabase
      .from('projects')
      .select('ticket_prefix')
      .eq('id', task.project_id)
      .single()

    let projectPrefix: string | null = null

    if (project?.ticket_prefix) {
      // Use configured prefix (e.g., "LP" → "LP-")
      projectPrefix = `${project.ticket_prefix}-`
      console.log('[createTask] Using project prefix:', projectPrefix)
    } else {
      console.log('[createTask] No ticket_prefix on project, falling back to pattern detection')
      // Fallback: detect from existing task titles
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('title')
        .eq('project_id', task.project_id)
        .order('created_at', { ascending: false })
        .limit(200)

      const titles = (existingTasks ?? []).map((t: { title: string }) => t.title)
      const prefixCounts: Record<string, number> = {}
      for (const t of titles) {
        const match = t.match(prefixPattern)
        if (match) {
          prefixCounts[match[1]] = (prefixCounts[match[1]] || 0) + 1
        }
      }
      projectPrefix = Object.entries(prefixCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    }

    if (projectPrefix) {
      // Find max existing number for this prefix
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('title')
        .eq('project_id', task.project_id)
        .like('title', `${projectPrefix}%`)

      const numberPattern = new RegExp(`^${projectPrefix.replace('-', '\\-')}(\\d{3})`)
      let maxNum = 0
      for (const t of (existingTasks ?? [])) {
        const match = t.title.match(numberPattern)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
      const nextNum = String(maxNum + 1).padStart(3, '0')
      finalTitle = `${projectPrefix}${nextNum}: ${task.title}`
    }
  }

  // Get max position for the status column
  const { data: maxPos } = await supabase
    .from('tasks')
    .select('position')
    .eq('project_id', task.project_id)
    .eq('status', task.status || 'backlog')
    .order('position', { ascending: false })
    .limit(1)

  const position = maxPos && maxPos.length > 0 ? maxPos[0].position + 1 : 0

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, title: finalTitle, position })
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTask(supabase: SupabaseClient, id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function moveTask(supabase: SupabaseClient, id: string, newStatus: TaskStatus, newPosition: number) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: newStatus, position: newPosition, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function restoreTask(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function permanentlyDeleteTask(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function bulkMoveTasks(supabase: SupabaseClient, taskIds: string[], newStatus: TaskStatus) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in('id', taskIds)
  if (error) throw error
}

export async function bulkUpdatePriority(supabase: SupabaseClient, taskIds: string[], priority: TaskPriority) {
  const { error } = await supabase
    .from('tasks')
    .update({ priority, updated_at: new Date().toISOString() })
    .in('id', taskIds)
  if (error) throw error
}

export async function bulkDeleteTasks(supabase: SupabaseClient, taskIds: string[]) {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', taskIds)
  if (error) throw error
}

export async function getDeletedTasks(supabase: SupabaseClient, projectId?: string) {
  let query = supabase
    .from('tasks')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (projectId) {
    query = query.eq('project_id', projectId)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Task[]
}

export async function getAllDeletedTasksCount(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)
  if (error) throw error
  return count ?? 0
}

// ── Task Comments ──

export async function getTaskComments(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error

  // Fetch user profiles separately (no direct FK from task_comments to profiles)
  const userIds = [...new Set(data.map((c: TaskComment) => c.user_id))]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles || []).map((p: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>) => [p.id, p]))
  return data.map((c: TaskComment) => ({
    ...c,
    user: profileMap.get(c.user_id) || { id: c.user_id, full_name: null, avatar_url: null }
  })) as (TaskComment & { user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> })[]
}

export async function createTaskComment(supabase: SupabaseClient, comment: {
  task_id: string
  user_id: string
  content: string
}) {
  const { data, error } = await supabase
    .from('task_comments')
    .insert(comment)
    .select('*')
    .single()
  if (error) throw error

  // Fetch the user profile
  const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', comment.user_id).single()
  return { ...data, user: profile || { id: comment.user_id, full_name: null, avatar_url: null } } as TaskComment & { user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> }
}

export async function deleteTaskComment(supabase: SupabaseClient, commentId: string) {
  const { error } = await supabase.from('task_comments').delete().eq('id', commentId)
  if (error) throw error
}

// ── Dashboard Stats ──

export async function getDashboardStats(supabase: SupabaseClient) {
  const now = new Date().toISOString()

  const { data: { user } } = await supabase.auth.getUser()

  const [projectsRes, tasksRes, activityRes, sharedRes] = await Promise.all([
    supabase.from('projects').select('id, name', { count: 'exact' }).eq('archived', false),
    supabase.from('tasks').select('id, status, priority, due_date, project_id, title, created_at, deleted_at').is('deleted_at', null),
    supabase.from('task_activity').select('id, task_id, action, old_value, new_value, created_at, user_id').order('created_at', { ascending: false }).limit(10),
    user ? supabase.from('project_members').select('id', { count: 'exact' }).eq('user_id', user.id).neq('role', 'owner') : { count: 0 },
  ])

  const tasks = tasksRes.data || []
  const projects = projectsRes.data || []
  const activity = activityRes.data || []
  const totalTasks = tasks.length
  const completed = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date(now) && t.status !== 'done').length

  // Stale tasks: in backlog for 7+ days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const stale = tasks.filter(t => t.status === 'backlog' && t.created_at < sevenDaysAgo)

  // Tasks per project
  const projectStats = projects.map(p => ({
    id: p.id,
    name: p.name,
    total: tasks.filter(t => t.project_id === p.id).length,
    done: tasks.filter(t => t.project_id === p.id && t.status === 'done').length,
    inProgress: tasks.filter(t => t.project_id === p.id && t.status === 'in_progress').length,
  }))

  // Fetch user profiles for activity
  const userIds = [...new Set(activity.map(a => a.user_id).filter(Boolean))] as string[]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] }
  const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]))

  const recentActivity = activity.map(a => ({
    ...a,
    userName: a.user_id ? profileMap.get(a.user_id) || 'Unknown' : 'System',
  }))

  // Done this week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const doneThisWeek = activity.filter(a =>
    a.action === 'status_changed' && a.new_value === 'done' && new Date(a.created_at) >= weekStart
  ).length

  return {
    totalProjects: projectsRes.count || 0,
    sharedProjectCount: sharedRes.count || 0,
    totalTasks,
    inProgress,
    completed,
    overdue,
    doneThisWeek,
    completionRate: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
    staleTasks: stale.map(t => ({ id: t.id, title: t.title, created_at: t.created_at })),
    projectStats,
    recentActivity,
  }
}

// ── Project Members & Invites ──

export async function getProjectMembers(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profile:profiles!project_members_user_id_fkey(id, full_name, email, avatar_url)')
    .eq('project_id', projectId)
  if (error) throw error
  return data as (ProjectMember & { profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> })[]
}

export async function getProjectMemberRole(supabase: SupabaseClient, projectId: string, userId: string): Promise<MemberRole | null> {
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.role ?? null
}

export async function updateMemberRole(supabase: SupabaseClient, projectId: string, userId: string, role: MemberRole) {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(supabase: SupabaseClient, projectId: string, userId: string) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getProjectInvites(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ProjectInvite[]
}

export async function createInvite(supabase: SupabaseClient, invite: {
  project_id: string
  invited_email: string
  role: MemberRole
  invited_by: string
}) {
  const { data, error } = await supabase
    .from('project_invites')
    .insert({ ...invite, invited_email: invite.invited_email.toLowerCase().trim() })
    .select()
    .single()
  if (error) throw error
  return data as ProjectInvite
}

export async function deleteInvite(supabase: SupabaseClient, inviteId: string) {
  const { error } = await supabase
    .from('project_invites')
    .delete()
    .eq('id', inviteId)
  if (error) throw error
}

export async function acceptPendingInvites(supabase: SupabaseClient, userId: string, email: string) {
  const { error } = await supabase.rpc('accept_pending_invites', {
    p_user_id: userId,
    p_email: email,
  })
  if (error) throw error
}

export async function getSharedProjects(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('role, project:projects!project_members_project_id_fkey(*, tasks(id, status, deleted_at))')
    .eq('user_id', userId)
    .neq('role', 'owner')
  if (error) throw error

  return (data ?? [])
    .filter((d) => d.project !== null)
    .map(({ role, project }) => {
      const p = project as unknown as Project & { tasks: { id: string; status: string; deleted_at: string | null }[] }
      const active = (p.tasks ?? []).filter((t) => !t.deleted_at)
      return {
        ...p,
        tasks: undefined,
        role,
        taskProgress: {
          done: active.filter((t) => t.status === 'done').length,
          total: active.length,
        },
      }
    }) as (Project & { role: MemberRole; taskProgress: { done: number; total: number } })[]
}

// ── Task Activity ──

export async function getTaskActivity(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from('task_activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error

  // Fetch user profiles
  const userIds = [...new Set((data as TaskActivity[]).map(a => a.user_id).filter(Boolean))] as string[]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles || []).map((p: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>) => [p.id, p]))
  return (data as TaskActivity[]).map(a => ({
    ...a,
    user: a.user_id ? profileMap.get(a.user_id) || { id: a.user_id, full_name: null, avatar_url: null } : null
  }))
}

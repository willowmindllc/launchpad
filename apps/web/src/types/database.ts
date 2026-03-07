export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export type AIProvider = 'groq' | 'openai' | 'anthropic' | 'google'

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
}

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  email: string | null
  avatar_url: string | null
  ai_provider: AIProvider | null
  ai_api_key: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  project_id: string
  assignee_id: string | null
  due_date: string | null
  position: number
  deleted_at: string | null
  github_issue_number: number | null
  github_issue_url: string | null
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
}

export type TaskActivityAction = 'title_changed' | 'status_changed' | 'priority_changed' | 'description_changed' | 'trashed' | 'restored'

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string | null
  action: TaskActivityAction
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export type InviteStatus = 'pending' | 'accepted' | 'declined'

export interface ProjectInvite {
  id: string
  project_id: string
  invited_email: string
  role: MemberRole
  invited_by: string | null
  status: InviteStatus
  created_at: string
  accepted_at: string | null
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Editor',
  member: 'Commenter',
  viewer: 'Viewer',
}

export const SHAREABLE_ROLES: { value: MemberRole; label: string }[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'member', label: 'Commenter' },
  { value: 'admin', label: 'Editor' },
]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']

export interface GitHubConnection {
  id: string
  user_id: string
  access_token: string
  github_username: string
  github_avatar_url: string | null
  created_at: string
}

export interface ProjectGitHubLink {
  id: string
  project_id: string
  repo_owner: string
  repo_name: string
  webhook_id: number | null
  sync_issues: boolean
  created_at: string
}

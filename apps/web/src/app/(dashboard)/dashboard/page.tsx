import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const ACTION_LABELS: Record<string, string> = {
  title_changed: 'renamed a task',
  status_changed: 'changed status',
  priority_changed: 'changed priority',
  description_changed: 'updated description',
  trashed: 'trashed a task',
  restored: 'restored a task',
}

function EmptyState({ hasSharedProjects }: { hasSharedProjects: boolean }) {
  if (hasSharedProjects) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 text-6xl">👋</div>
        <h2 className="mb-2 text-2xl font-bold">Welcome, Collaborator!</h2>
        <p className="mb-6 max-w-md text-muted-foreground">
          You have projects shared with you. Head to your projects page to get started.
        </p>
        <div className="flex gap-3">
          <Link href="/projects">
            <Button size="lg">
              View Your Projects
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 text-6xl">🚀</div>
      <h2 className="mb-2 text-2xl font-bold">Welcome to LaunchPad</h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        Your personal project command center. Track tasks, manage sprints, and ship faster.
      </p>
      <div className="flex gap-3">
        <Link href="/projects">
          <Button size="lg">
            Create Your First Project
          </Button>
        </Link>
      </div>
      <div className="mt-12 grid max-w-lg gap-4 text-left">
        <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
          <span className="text-xl">📋</span>
          <div>
            <p className="font-medium">Kanban Board</p>
            <p className="text-sm text-muted-foreground">Drag-and-drop tasks across Backlog, In Progress, Review, and Done</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
          <span className="text-xl">🤖</span>
          <div>
            <p className="font-medium">AI-Powered</p>
            <p className="text-sm text-muted-foreground">Chat to create tasks, get AI suggestions, and auto-number tickets</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
          <span className="text-xl">👥</span>
          <div>
            <p className="font-medium">Team Collaboration</p>
            <p className="text-sm text-muted-foreground">Invite teammates, assign tasks, and track progress together</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stats = await getDashboardStats(supabase)

  if (stats.totalProjects === 0 && stats.totalTasks === 0) {
    return (
      <div>
        <Header title="Dashboard" description="Your mission control overview" />
        <EmptyState hasSharedProjects={stats.sharedProjectCount > 0} />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Tasks', value: stats.totalTasks, icon: '📋', color: 'text-foreground' },
    { label: 'In Progress', value: stats.inProgress, icon: '🔄', color: 'text-blue-400' },
    { label: 'Done This Week', value: stats.doneThisWeek, icon: '🔥', color: 'text-orange-400' },
    { label: 'Overdue', value: stats.overdue, icon: '⚠️', color: stats.overdue > 0 ? 'text-red-400' : 'text-muted-foreground' },
  ]

  return (
    <div>
      <Header title="Dashboard" description="Your mission control overview" />
      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <span className="text-xl">{stat.icon}</span>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion Rate + Projects Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Completion Rate */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold">{stats.completionRate}%</span>
                <span className="text-sm text-muted-foreground mb-1">
                  {stats.completed} of {stats.totalTasks} tasks
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* My Projects */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Projects
              </CardTitle>
              <span className="text-xs text-muted-foreground">{stats.totalProjects} total</span>
            </CardHeader>
            <CardContent>
              {stats.projectStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.projectStats.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {p.name}
                        </span>
                        <div className="flex gap-2">
                          {p.inProgress > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {p.inProgress} active
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {p.done}/{p.total}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: p.total > 0 ? `${(p.done / p.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity + Stale Tasks Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Activity */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5 text-[10px]">
                        🔄
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">{a.userName}</span>
                          {' '}{ACTION_LABELS[a.action] || a.action}
                          {a.old_value && a.new_value && (
                            <>
                              {' '}
                              <span className="line-through opacity-50">{a.old_value}</span>
                              {' → '}
                              <span className="font-medium text-foreground/70">{a.new_value}</span>
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {new Date(a.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stale Tasks */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                🧊 Stale Tasks
                {stats.staleTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {stats.staleTasks.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.staleTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stale tasks — backlog is fresh 👍</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    In backlog for 7+ days. Time to prioritize or archive.
                  </p>
                  {stats.staleTasks.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm truncate">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))}d old
                      </span>
                    </div>
                  ))}
                  {stats.staleTasks.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{stats.staleTasks.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

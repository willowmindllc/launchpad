import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Task, TaskPriority } from '@/types/database'
import { cn } from '@/lib/utils'

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="group cursor-pointer border-border/50 transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5">
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
          <Badge variant="outline" className={cn('shrink-0 text-[10px]', priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {task.description && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between">
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">
              📅 {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.assignee_id && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">U</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

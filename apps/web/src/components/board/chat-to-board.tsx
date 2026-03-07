'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle,
  Send,
  X,
  Plus,
  Loader2,
  History,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Pencil,
  ListTodo,
  AlertCircle,
  CirclePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskStatus, TaskPriority } from '@/types/database'
import { TASK_STATUS_LABELS } from '@/types/database'

// ── Types ──

interface TaskData {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
}

interface ExecutedAction {
  type: string
  success: boolean
  error?: string
  task?: TaskData | null
  tasks?: TaskData[]
  from_status?: string
  to_status?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions_executed?: ExecutedAction[]
}

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatToBoardProps {
  projectId: string
  projectName: string
  onTasksAdded: () => void
}

// ── Styling constants ──

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const statusColors: Record<TaskStatus, string> = {
  backlog: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const actionIcons: Record<string, typeof CheckCircle2> = {
  create: CirclePlus,
  move: ArrowRight,
  update: Pencil,
  delete: Trash2,
  list: ListTodo,
}

// ── Inline task card preview ──

function InlineTaskCard({ task, label }: { task: TaskData; label?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/50 bg-background/80 p-2 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {label && (
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide shrink-0">
              {label}
            </span>
          )}
          <p className="text-xs font-medium truncate">{task.title}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge
            variant="outline"
            className={cn('text-[9px] px-1 py-0 h-4 leading-none', statusColors[task.status])}
          >
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-[9px] px-1 py-0 h-4 leading-none', priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.due_date && (
            <span className="text-[9px] text-muted-foreground">
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
        )}
      </div>
    </div>
  )
}

// ── Action result display ──

function ActionResult({ action }: { action: ExecutedAction }) {
  const Icon = actionIcons[action.type] || CheckCircle2

  if (!action.success) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 rounded-md px-2 py-1">
        <AlertCircle className="size-3 shrink-0" />
        <span>Failed: {action.error || `${action.type} action failed`}</span>
      </div>
    )
  }

  if (action.type === 'list' && action.tasks) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ListTodo className="size-3" />
          <span>{action.tasks.length} task{action.tasks.length !== 1 ? 's' : ''} found</span>
        </div>
        {action.tasks.map((task) => (
          <InlineTaskCard key={task.id} task={task} />
        ))}
        {action.tasks.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic">No matching tasks.</p>
        )}
      </div>
    )
  }

  if (action.type === 'delete' && action.task) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 rounded-md px-2 py-1.5">
        <Trash2 className="size-3 shrink-0" />
        <span>Deleted &ldquo;{action.task.title}&rdquo;</span>
      </div>
    )
  }

  if (action.type === 'move' && action.task) {
    const fromLabel = action.from_status ? TASK_STATUS_LABELS[action.from_status as TaskStatus] : '?'
    const toLabel = action.to_status ? TASK_STATUS_LABELS[action.to_status as TaskStatus] : '?'
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ArrowRight className="size-3" />
          <span>Moved from <strong>{fromLabel}</strong> to <strong>{toLabel}</strong></span>
        </div>
        <InlineTaskCard task={action.task} />
      </div>
    )
  }

  if (action.task) {
    const label =
      action.type === 'create'
        ? 'Created'
        : action.type === 'update'
          ? 'Updated'
          : undefined
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Icon className="size-3" />
          <span>{label || action.type}</span>
        </div>
        <InlineTaskCard task={action.task} label={label} />
      </div>
    )
  }

  return null
}

// ── Main component ──

export function ChatToBoard({ projectId, projectName, onTasksAdded }: ChatToBoardProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase.auth])

  // Load sessions when panel opens
  const loadSessions = useCallback(async () => {
    if (!userId) return
    setSessionsLoading(true)
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    setSessions(data || [])
    setSessionsLoading(false)
  }, [userId, projectId, supabase])

  useEffect(() => {
    if (open && userId) loadSessions()
  }, [open, userId, loadSessions])

  // Load messages for a session
  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content, actions_json')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(
          data.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            actions_executed: m.actions_json as ExecutedAction[] | undefined,
          }))
        )
      }
    },
    [supabase]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && !showHistory) inputRef.current?.focus()
  }, [open, showHistory])

  const createSession = async (): Promise<string | null> => {
    if (!userId) return null
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ project_id: projectId, user_id: userId })
      .select('id')
      .single()
    if (error || !data) return null
    return data.id
  }

  const persistMessage = async (sessionId: string, msg: ChatMessage) => {
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
      tasks_json: null,
      actions_json: msg.actions_executed || null,
    })
  }

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
    await supabase
      .from('chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
    )
  }

  const touchSession = async (sessionId: string) => {
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }

  const startNewChat = () => {
    setCurrentSessionId(null)
    setMessages([])
    setShowHistory(false)
  }

  const switchSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id)
    setShowHistory(false)
    await loadSessionMessages(session.id)
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('chat_sessions').delete().eq('id', sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      startNewChat()
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Ensure we have a session
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createSession()
      if (!sessionId) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: 'Failed to create chat session. Please try again.' },
        ])
        setLoading(false)
        return
      }
      setCurrentSessionId(sessionId)
      await updateSessionTitle(sessionId, userMessage.content)
      setSessions((prev) => [
        {
          id: sessionId!,
          title: userMessage.content.slice(0, 50),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ])
    } else {
      await touchSession(sessionId)
    }

    // Persist user message
    await persistMessage(sessionId, userMessage)

    try {
      const res = await fetch('/api/ai/chat-to-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          projectId,
        }),
      })

      const data = await res.json()

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || '',
        actions_executed: data.actions_executed || [],
      }

      setMessages([...newMessages, assistantMessage])

      // Persist assistant message
      await persistMessage(sessionId, assistantMessage)

      // Refresh board if any mutating actions were executed
      const hasMutations = (data.actions_executed || []).some(
        (a: ExecutedAction) =>
          a.success && ['create', 'move', 'update', 'delete'].includes(a.type)
      )
      if (hasMutations) {
        onTasksAdded()
      }
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Try again.',
      }
      setMessages([...newMessages, errMsg])
      await persistMessage(sessionId, errMsg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  // Quick command suggestions
  const quickCommands = [
    { label: 'Show board', command: 'Show me all tasks on the board' },
    { label: 'Add task', command: 'Create a new task: ' },
    { label: 'What\'s in progress?', command: 'Show me tasks that are in progress' },
  ]

  return (
    <>
      {/* Toggle button */}
      <Button
        onClick={() => setOpen(!open)}
        size="sm"
        className={cn(
          'gap-2',
          open && 'bg-primary text-primary-foreground'
        )}
        variant={open ? 'default' : 'outline'}
      >
        <MessageCircle className="size-4" />
        Chat to Board
      </Button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full md:w-[480px] md:bottom-4 md:right-4 flex flex-col h-[70vh] md:h-[600px] md:rounded-xl border border-border/50 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {showHistory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setShowHistory(false)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {showHistory ? 'Chat History' : 'Chat to Board'}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{projectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!showHistory && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setShowHistory(true)}
                    title="Chat history"
                  >
                    <History className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={startNewChat}
                    title="New chat"
                  >
                    <Plus className="size-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {showHistory ? (
            /* Session history list */
            <div className="flex-1 overflow-y-auto">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-12 px-4">
                  <History className="size-8 mx-auto mb-3 opacity-50" />
                  <p>No chat history yet.</p>
                  <p className="text-xs mt-1">Start a conversation to see it here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => switchSession(session)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors group flex items-start gap-3',
                        currentSessionId === session.id && 'bg-muted/50'
                      )}
                    >
                      <MessageCircle className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(session.updated_at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => deleteSession(session.id, e)}
                        title="Delete chat"
                      >
                        <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </button>
                  ))}
                </div>
              )}
              <div className="p-3 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={startNewChat}
                >
                  <Plus className="size-3" />
                  New Chat
                </Button>
              </div>
            </div>
          ) : (
            /* Chat view */
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-6">
                    <MessageCircle className="size-8 mx-auto mb-3 opacity-50" />
                    <p>Describe what you&apos;re building.</p>
                    <p className="text-xs mt-1">I&apos;ll create, move, and manage tasks on your board.</p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                      {quickCommands.map((cmd) => (
                        <button
                          key={cmd.label}
                          onClick={() => {
                            setInput(cmd.command)
                            inputRef.current?.focus()
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                        >
                          {cmd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Action results with inline task cards */}
                      {msg.actions_executed && msg.actions_executed.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-border/20 pt-2">
                          {msg.actions_executed.map((action, j) => (
                            <ActionResult key={j} action={action} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">Processing...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border/50 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Create tasks, move to done, show backlog..."
                    className="flex-1 text-sm"
                    disabled={loading}
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || loading}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

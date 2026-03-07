import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AIProvider, TaskStatus, TaskPriority } from '@/types/database'

// ── Types ──

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIAction {
  type: 'create' | 'update' | 'move' | 'delete' | 'list'
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus | 'all'
  taskTitle?: string
}

export interface ExecutedAction {
  type: string
  success: boolean
  error?: string
  task?: TaskData | null
  tasks?: TaskData[]
  from_status?: string
  to_status?: string
}

export interface TaskData {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
}

// ── System prompt ──

function buildSystemPrompt(taskContext: string) {
  return `You are LaunchPad AI, a project management assistant integrated with a Kanban board. You help users manage tasks through natural language commands.

${taskContext}

You must respond with ONLY valid JSON (no markdown fences, no text outside JSON). Structure:

{
  "message": "Your friendly conversational response (markdown supported)",
  "actions": [
    { "type": "create", "title": "Task title", "description": "Brief description", "priority": "medium", "status": "backlog" },
    { "type": "move", "taskTitle": "partial title match", "status": "in_progress" },
    { "type": "update", "taskTitle": "partial title match", "title": "new title", "description": "new desc", "priority": "high" },
    { "type": "delete", "taskTitle": "partial title match" },
    { "type": "list", "status": "all" }
  ]
}

COMMANDS:
- CREATE: When user wants to add new tasks. Include title (max 80 chars), description (1-2 sentences), priority (low/medium/high/urgent), status (backlog/in_progress/review/done, default backlog).
- MOVE: When user wants to change a task's status column. e.g. "mark X as done", "move X to review". Use taskTitle to fuzzy-match the task, and status for the target column.
- UPDATE: When user wants to edit task details (title, description, priority). Use taskTitle to identify the task and include the fields to change.
- DELETE: When user wants to remove a task. Uses soft-delete. Use taskTitle to fuzzy-match.
- LIST: When user asks "what's on the board", "show me backlog tasks", etc. Use status to filter (backlog/in_progress/review/done) or "all" for everything.

GUIDELINES:
- taskTitle should contain enough of the task name to uniquely identify it from the board
- Valid statuses: backlog, in_progress, review, done
- Valid priorities: low, medium, high, urgent
- When creating multiple tasks, include all of them as separate create actions
- Use a mix of priorities when creating batches (mostly medium/high)
- If the user is just chatting or asking questions unrelated to task management, return empty actions array
- Always include a helpful, concise message summarizing what you did or will do
- For list queries, mention in your message what you're showing
- Keep task titles concise and actionable
- Keep descriptions brief but useful`
}

// ── Multi-provider AI call ──

interface ProviderConfig {
  url: string
  model: string
  buildBody: (messages: { role: string; content: string }[]) => Record<string, unknown>
  buildHeaders: (apiKey: string) => Record<string, string>
  extractContent: (data: Record<string, unknown>) => string | null
}

const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    buildBody: (messages) => ({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    extractContent: (data) => {
      const choices = data.choices as { message: { content: string } }[] | undefined
      return choices?.[0]?.message?.content ?? null
    },
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildBody: (messages) => ({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    extractContent: (data) => {
      const choices = data.choices as { message: { content: string } }[] | undefined
      return choices?.[0]?.message?.content ?? null
    },
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    buildBody: (messages) => ({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: messages[0].content,
      messages: messages.slice(1),
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    extractContent: (data) => {
      const content = data.content as { type: string; text: string }[] | undefined
      return content?.find((c) => c.type === 'text')?.text ?? null
    },
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    buildBody: (messages) => ({
      contents: messages.slice(1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: { parts: [{ text: messages[0].content }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    extractContent: (data) => {
      const candidates = data.candidates as { content: { parts: { text: string }[] } }[] | undefined
      return candidates?.[0]?.content?.parts?.[0]?.text ?? null
    },
  },
}

async function callAI(provider: AIProvider, apiKey: string, messages: { role: string; content: string }[]) {
  const config = PROVIDERS[provider]
  let url = config.url
  if (provider === 'google') {
    url += `?key=${apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(config.buildBody(messages)),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`${provider} API error:`, response.status, errorBody)
    return null
  }

  const data = await response.json()
  return config.extractContent(data)
}

// ── Action execution ──

async function executeActions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  actions: AIAction[]
): Promise<ExecutedAction[]> {
  const results: ExecutedAction[] = []

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create': {
          // Get max position for the target column
          const targetStatus = action.status || 'backlog'
          const { data: maxPos } = await supabase
            .from('tasks')
            .select('position')
            .eq('project_id', projectId)
            .eq('status', targetStatus)
            .is('deleted_at', null)
            .order('position', { ascending: false })
            .limit(1)

          const position = maxPos && maxPos.length > 0 ? maxPos[0].position + 1 : 0

          const { data: task, error } = await supabase
            .from('tasks')
            .insert({
              project_id: projectId,
              title: action.title || 'Untitled Task',
              description: action.description || null,
              priority: action.priority || 'medium',
              status: targetStatus,
              position,
            })
            .select('id, title, description, status, priority, due_date')
            .single()

          if (error) throw error
          results.push({ type: 'create', success: true, task })
          break
        }

        case 'move': {
          if (!action.taskTitle || !action.status) {
            results.push({ type: 'move', success: false, error: 'Missing taskTitle or status' })
            break
          }

          const { data: matches } = await supabase
            .from('tasks')
            .select('id, title, status, priority, description, due_date')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .ilike('title', `%${action.taskTitle}%`)
            .limit(1)

          if (!matches?.[0]) {
            results.push({ type: 'move', success: false, error: `Task "${action.taskTitle}" not found` })
            break
          }

          const fromStatus = matches[0].status
          const { data: targetTasks } = await supabase
            .from('tasks')
            .select('position')
            .eq('project_id', projectId)
            .eq('status', action.status)
            .is('deleted_at', null)
            .order('position', { ascending: false })
            .limit(1)

          const newPosition = targetTasks && targetTasks.length > 0 ? targetTasks[0].position + 1 : 0

          const { data: updated, error } = await supabase
            .from('tasks')
            .update({
              status: action.status,
              position: newPosition,
              updated_at: new Date().toISOString(),
            })
            .eq('id', matches[0].id)
            .select('id, title, description, status, priority, due_date')
            .single()

          if (error) throw error
          results.push({
            type: 'move',
            success: true,
            task: updated,
            from_status: fromStatus,
            to_status: action.status,
          })
          break
        }

        case 'update': {
          if (!action.taskTitle) {
            results.push({ type: 'update', success: false, error: 'Missing taskTitle' })
            break
          }

          const { data: updateMatches } = await supabase
            .from('tasks')
            .select('id, title, status, priority, description, due_date')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .ilike('title', `%${action.taskTitle}%`)
            .limit(1)

          if (!updateMatches?.[0]) {
            results.push({ type: 'update', success: false, error: `Task "${action.taskTitle}" not found` })
            break
          }

          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (action.title) updates.title = action.title
          if (action.description) updates.description = action.description
          if (action.priority) updates.priority = action.priority

          const { data: updatedTask, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', updateMatches[0].id)
            .select('id, title, description, status, priority, due_date')
            .single()

          if (error) throw error
          results.push({ type: 'update', success: true, task: updatedTask })
          break
        }

        case 'delete': {
          if (!action.taskTitle) {
            results.push({ type: 'delete', success: false, error: 'Missing taskTitle' })
            break
          }

          const { data: deleteMatches } = await supabase
            .from('tasks')
            .select('id, title, status, priority, description, due_date')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .ilike('title', `%${action.taskTitle}%`)
            .limit(1)

          if (!deleteMatches?.[0]) {
            results.push({ type: 'delete', success: false, error: `Task "${action.taskTitle}" not found` })
            break
          }

          const { error } = await supabase
            .from('tasks')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', deleteMatches[0].id)

          if (error) throw error
          results.push({ type: 'delete', success: true, task: deleteMatches[0] })
          break
        }

        case 'list': {
          let query = supabase
            .from('tasks')
            .select('id, title, description, status, priority, due_date')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .order('position', { ascending: true })

          if (action.status && action.status !== 'all') {
            query = query.eq('status', action.status)
          }

          const { data: listedTasks, error } = await query
          if (error) throw error
          results.push({ type: 'list', success: true, tasks: listedTasks || [] })
          break
        }
      }
    } catch (err) {
      console.error(`Action ${action.type} failed:`, err)
      results.push({
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return results
}

// ── Route handler ──

export async function POST(request: Request) {
  try {
    const { messages, projectId } = (await request.json()) as {
      messages: ChatMessage[]
      projectId: string
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine AI provider and API key
    let provider: AIProvider = 'groq'
    let apiKey = process.env.GROQ_API_KEY || ''

    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_provider, ai_api_key')
      .eq('id', user.id)
      .single()

    if (profile?.ai_provider && profile?.ai_api_key) {
      provider = profile.ai_provider as AIProvider
      apiKey = profile.ai_api_key
    }

    if (!apiKey) {
      return NextResponse.json(
        { message: 'No AI API key configured. Add one in Settings or set GROQ_API_KEY.', actions_executed: [] },
        { status: 200 }
      )
    }

    // Build task context
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, description')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('position')

    let taskContext = 'CURRENT BOARD STATE: (empty board - no tasks yet)'
    if (tasks && tasks.length > 0) {
      const taskLines = tasks.map(
        (t) => `- [${t.status}] "${t.title}" (${t.priority})${t.description ? ` — ${t.description.slice(0, 60)}` : ''}`
      )
      taskContext = `CURRENT BOARD STATE (${tasks.length} tasks):\n${taskLines.join('\n')}`
    }

    const systemPrompt = buildSystemPrompt(taskContext)
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const content = await callAI(provider, apiKey, apiMessages)

    if (!content) {
      return NextResponse.json({
        message: "Sorry, I couldn't process that. Please try again.",
        actions_executed: [],
      })
    }

    // Parse AI response
    let parsed: { message?: string; actions?: AIAction[] }
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({
        message: content,
        actions_executed: [],
      })
    }

    const aiMessage = parsed.message || ''
    const aiActions = Array.isArray(parsed.actions) ? parsed.actions : []

    // Execute actions server-side
    let actionsExecuted: ExecutedAction[] = []
    if (aiActions.length > 0) {
      actionsExecuted = await executeActions(supabase, projectId, aiActions)
    }

    return NextResponse.json({
      message: aiMessage,
      actions_executed: actionsExecuted,
    })
  } catch (error) {
    console.error('Chat-to-board error:', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.', actions_executed: [] },
      { status: 200 }
    )
  }
}

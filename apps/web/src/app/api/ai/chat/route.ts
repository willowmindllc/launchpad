import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AIProvider } from '@/types/database'

const SYSTEM_PROMPT = `You are LaunchPad AI, a project management assistant. You help users plan projects by creating actionable task breakdowns.

When a user describes a project or feature, respond conversationally AND extract tasks. 

Your response must be valid JSON with this structure:
{
  "message": "Your conversational response to the user (markdown supported)",
  "tasks": [
    {
      "title": "Short task title (max 80 chars)",
      "description": "1-2 sentence description",
      "priority": "low" | "medium" | "high" | "urgent",
      "status": "backlog"
    }
  ]
}

Guidelines:
- Always include a friendly, helpful "message" 
- Only include "tasks" array when the user is describing work to be done
- If the user is just chatting or asking questions, return empty tasks array
- Tasks should be specific and actionable
- Use a mix of priorities (mostly medium/high)
- Keep task titles concise
- If the user says things like "mark X as done", "move X to review", "delete X", include an "actions" array instead:

{
  "message": "Done! Moved auth task to review.",
  "tasks": [],
  "actions": [
    { "type": "update_status", "taskTitle": "auth", "status": "review" }
  ]
}

Action types: update_status, delete_task
Valid statuses: backlog, in_progress, review, done

Respond with ONLY valid JSON — no markdown fences, no explanation outside the JSON.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

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

export async function POST(request: Request) {
  try {
    const { messages, projectId } = (await request.json()) as {
      messages: ChatMessage[]
      projectId?: string
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    // Get user's AI provider preference
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let provider: AIProvider = 'groq'
    let apiKey = process.env.GROQ_API_KEY || ''

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_provider, ai_api_key')
        .eq('id', user.id)
        .single()

      if (profile?.ai_provider && profile?.ai_api_key) {
        provider = profile.ai_provider as AIProvider
        apiKey = profile.ai_api_key
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'No AI API key configured' }, { status: 400 })
    }

    // Build context about existing tasks if projectId provided
    let taskContext = ''
    if (projectId && user) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status, priority')
        .eq('project_id', projectId)
        .order('position')

      if (tasks && tasks.length > 0) {
        taskContext = `\n\nCurrent tasks on the board:\n${tasks
          .map((t) => `- [${t.status}] ${t.title} (${t.priority})`)
          .join('\n')}`
      }
    }

    const config = PROVIDERS[provider]
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + taskContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    let url = config.url
    if (provider === 'google') {
      url += `?key=${apiKey}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify(config.buildBody(apiMessages)),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`${provider} API error:`, response.status, errorBody)
      return NextResponse.json(
        {
          message: "Sorry, I couldn't process that. Please try again.",
          tasks: [],
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    const content = config.extractContent(data)

    if (!content) {
      return NextResponse.json({ message: 'No response from AI', tasks: [] })
    }

    // Parse AI response
    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({
        message: parsed.message || '',
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      })
    } catch {
      // If JSON parsing fails, treat entire content as message
      return NextResponse.json({ message: content, tasks: [] })
    }
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.', tasks: [] },
      { status: 200 }
    )
  }
}

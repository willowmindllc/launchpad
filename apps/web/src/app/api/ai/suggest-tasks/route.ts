import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AIProvider } from '@/types/database'

interface TaskSuggestion {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

const MOCK_SUGGESTIONS: TaskSuggestion[] = [
  {
    title: 'Define project scope and requirements',
    description: 'Document the core features, target users, and success criteria for the project.',
    priority: 'high',
  },
  {
    title: 'Set up development environment',
    description: 'Initialize the repository, configure tooling, linting, and CI/CD pipeline.',
    priority: 'high',
  },
  {
    title: 'Design database schema',
    description: 'Plan the data models, relationships, and indexes needed for the application.',
    priority: 'high',
  },
  {
    title: 'Build core UI layout',
    description: 'Create the main application shell, navigation, and responsive layout components.',
    priority: 'medium',
  },
  {
    title: 'Implement authentication flow',
    description: 'Set up user registration, login, and session management.',
    priority: 'medium',
  },
  {
    title: 'Write unit tests for core logic',
    description: 'Add test coverage for the most critical business logic and utilities.',
    priority: 'medium',
  },
  {
    title: 'Create API documentation',
    description: 'Document all API endpoints, request/response formats, and error codes.',
    priority: 'low',
  },
  {
    title: 'Deploy to staging environment',
    description: 'Set up a staging environment and deploy the initial version for testing.',
    priority: 'low',
  },
]

const PROVIDER_CONFIG: Record<AIProvider, {
  url: string
  model: string
  buildBody: (prompt: string) => Record<string, unknown>
  extractContent: (data: Record<string, unknown>) => string | null
}> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    buildBody: (prompt) => ({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
    extractContent: (data) => {
      const choices = data.choices as { message: { content: string } }[] | undefined
      return choices?.[0]?.message?.content ?? null
    },
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildBody: (prompt) => ({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
    extractContent: (data) => {
      const choices = data.choices as { message: { content: string } }[] | undefined
      return choices?.[0]?.message?.content ?? null
    },
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    buildBody: (prompt) => ({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractContent: (data) => {
      const content = data.content as { type: string; text: string }[] | undefined
      const textBlock = content?.find((c) => c.type === 'text')
      return textBlock?.text ?? null
    },
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    buildBody: (prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
    extractContent: (data) => {
      const candidates = data.candidates as { content: { parts: { text: string }[] } }[] | undefined
      return candidates?.[0]?.content?.parts?.[0]?.text ?? null
    },
  },
}

function buildHeaders(provider: AIProvider, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  switch (provider) {
    case 'anthropic':
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
      break
    case 'google':
      // Google uses query param, handled in URL
      break
    default:
      // OpenAI-compatible (Groq, OpenAI)
      headers['Authorization'] = `Bearer ${apiKey}`
  }

  return headers
}

function buildUrl(provider: AIProvider, apiKey: string): string {
  const config = PROVIDER_CONFIG[provider]
  if (provider === 'google') {
    return `${config.url}?key=${apiKey}`
  }
  return config.url
}

export async function POST(request: Request) {
  try {
    const { projectName, projectDescription } = await request.json()

    if (!projectName) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    // Determine which provider + key to use
    let provider: AIProvider = 'groq'
    let apiKey: string | null = null

    // Try to get user's custom AI settings
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    // Fall back to server Groq key
    if (!apiKey) {
      apiKey = process.env.GROQ_API_KEY || null
      provider = 'groq'
    }

    // If still no key, return mock suggestions
    if (!apiKey) {
      return NextResponse.json({ suggestions: MOCK_SUGGESTIONS })
    }

    const prompt = `You are a project management expert. Given a project, suggest 5-8 actionable tasks to break it down into manageable work items.

Project Name: ${projectName}
${projectDescription ? `Project Description: ${projectDescription}` : ''}

Return a JSON array of task objects. Each task must have:
- "title": a short, actionable task title (max 80 chars)
- "description": a 1-2 sentence description of what needs to be done
- "priority": one of "low", "medium", "high", or "urgent"

Guidelines:
- Tasks should be specific and actionable, not vague
- Order from highest to lowest priority
- Include a mix of priorities (mostly medium/high)
- Focus on practical next steps, not aspirational goals
- Each task should be completable by one person

Respond with ONLY valid JSON — no markdown, no code fences, no explanation.`

    const config = PROVIDER_CONFIG[provider]
    const url = buildUrl(provider, apiKey)
    const headers = buildHeaders(provider, apiKey)
    const body = config.buildBody(prompt)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`${provider} API error:`, response.status, errorBody)
      return NextResponse.json(
        { error: `AI service error (${provider}). Falling back to suggestions.`, suggestions: MOCK_SUGGESTIONS },
        { status: 200 }
      )
    }

    const data = await response.json()
    const content = config.extractContent(data)

    if (!content) {
      return NextResponse.json({ suggestions: MOCK_SUGGESTIONS })
    }

    const parsed = JSON.parse(content)
    const suggestions: TaskSuggestion[] = Array.isArray(parsed) ? parsed : (parsed.tasks || parsed.suggestions || [])

    // Validate the response shape
    const validSuggestions = suggestions
      .filter(
        (s) =>
          typeof s.title === 'string' &&
          typeof s.description === 'string' &&
          ['low', 'medium', 'high', 'urgent'].includes(s.priority)
      )
      .slice(0, 8)

    if (validSuggestions.length === 0) {
      return NextResponse.json({ suggestions: MOCK_SUGGESTIONS })
    }

    return NextResponse.json({ suggestions: validSuggestions })
  } catch (error) {
    console.error('Suggest tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', suggestions: MOCK_SUGGESTIONS },
      { status: 200 }
    )
  }
}

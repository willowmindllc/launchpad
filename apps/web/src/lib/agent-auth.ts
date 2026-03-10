import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { AgentPermission } from '@/types/database'

interface AgentAuthResult {
  projectId: string
  tokenId: string
  permissions: AgentPermission[]
  createdBy: string
}

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export { createServiceClient }

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export { hashToken }

export async function authenticateAgent(
  req: NextRequest
): Promise<{ auth: AgentAuthResult } | { error: NextResponse }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <token>' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.slice(7)
  const tokenHash = await hashToken(token)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('agent_tokens')
    .select('id, project_id, permissions, created_by, revoked_at')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !data) {
    return {
      error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    }
  }

  if (data.revoked_at) {
    return {
      error: NextResponse.json({ error: 'Token has been revoked' }, { status: 401 }),
    }
  }

  // Update last_used_at (non-blocking)
  supabase
    .from('agent_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    auth: {
      projectId: data.project_id,
      tokenId: data.id,
      permissions: data.permissions as AgentPermission[],
      createdBy: data.created_by,
    },
  }
}

// Rate limit key for agent tokens (per-token instead of per-IP)
export function agentRateLimitKey(tokenId: string): string {
  return `agent:${tokenId}`
}

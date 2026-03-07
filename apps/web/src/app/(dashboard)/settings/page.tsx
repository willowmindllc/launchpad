'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type AIProvider, AI_PROVIDER_LABELS } from '@/types/database'
import { GitHubSettings } from '@/components/settings/github-settings'

const providers = Object.entries(AI_PROVIDER_LABELS) as [AIProvider, string][]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState<AIProvider | ''>('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('ai_provider, ai_api_key')
        .eq('id', user.id)
        .single()

      if (data) {
        setProvider((data.ai_provider as AIProvider) || '')
        if (data.ai_api_key) {
          setHasExistingKey(true)
        }
      }
      setLoading(false)
    }
    loadSettings()
  }, [supabase, router])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const updates: Record<string, string | null> = {
        ai_provider: provider || null,
        updated_at: new Date().toISOString(),
      }

      // Only update API key if user entered a new one
      if (apiKey) {
        updates.ai_api_key = apiKey
      }

      // If provider is cleared, clear the key too
      if (!provider) {
        updates.ai_api_key = null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'AI settings saved successfully.' })
      if (apiKey) {
        setHasExistingKey(true)
        setApiKey('')
        setShowKey(false)
      }
      if (!provider) {
        setHasExistingKey(false)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleClearKey = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          ai_provider: null,
          ai_api_key: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setProvider('')
      setApiKey('')
      setHasExistingKey(false)
      setShowKey(false)
      setMessage({ type: 'success', text: 'AI settings cleared. Using server defaults.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to clear settings.' })
    } finally {
      setSaving(false)
    }
  }

  const maskedKey = '••••••••••••••••'

  if (loading) {
    return (
      <div>
        <Header title="Settings" description="Manage your preferences" />
        <div className="p-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Settings" description="Manage your preferences" />
      <div className="p-6 max-w-2xl space-y-6">
        <GitHubSettings />
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🤖</span> AI Settings
            </CardTitle>
            <CardDescription>
              Bring your own API key to use your preferred AI provider for task suggestions.
              Without a key, the server default (Groq) is used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select
                value={provider}
                onValueChange={(val) => setProvider(val as AIProvider)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a provider..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API key input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    placeholder={hasExistingKey ? maskedKey : 'Enter your API key...'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {hasExistingKey && (
                <p className="text-xs text-muted-foreground">
                  A key is saved. Enter a new one to replace it, or leave blank to keep the current key.
                </p>
              )}
            </div>

            {/* Status message */}
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {message.text}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving || (!provider && !hasExistingKey)}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              {hasExistingKey && (
                <Button variant="outline" onClick={handleClearKey} disabled={saving}>
                  Clear Settings
                </Button>
              )}
            </div>

            {/* Current config summary */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-medium mb-1">Current Configuration</p>
              <p className="text-sm text-muted-foreground">
                {provider && hasExistingKey
                  ? `Using ${AI_PROVIDER_LABELS[provider as AIProvider]} with your API key`
                  : provider && apiKey
                    ? `Will use ${AI_PROVIDER_LABELS[provider as AIProvider]} after saving`
                    : 'Using server default (Groq — Llama 3.3 70B)'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

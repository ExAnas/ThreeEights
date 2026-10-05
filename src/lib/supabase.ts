import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CycleState } from '../features/cycle/types'

const URL_KEY = 'three-eights:supabase:url'
const KEY_KEY = 'three-eights:supabase:publishable-key'

export interface SupabaseConfig {
  url: string
  key: string
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()
  if (envUrl && envKey) return { url: envUrl, key: envKey }

  const url = localStorage.getItem(URL_KEY)?.trim() ?? ''
  const key = localStorage.getItem(KEY_KEY)?.trim() ?? ''
  return url && key ? { url, key } : null
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(URL_KEY, config.url.trim())
  localStorage.setItem(KEY_KEY, config.key.trim())
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(KEY_KEY)
}

export function makeSupabase(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

export async function loadRemoteState(client: SupabaseClient, userId: string): Promise<CycleState | null> {
  const { data, error } = await client
    .from('user_app_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  const candidate = data?.state as CycleState | undefined
  return candidate?.version === 1 ? candidate : null
}

export async function saveRemoteState(client: SupabaseClient, userId: string, state: CycleState): Promise<void> {
  const { error } = await client
    .from('user_app_state')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

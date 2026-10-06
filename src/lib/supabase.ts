import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CycleState } from '../features/cycle/types'

const DEFAULT_SUPABASE_URL = 'https://gjqjppebojyglxtiduzt.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5BwnM--fU2jFL_BLd6ozaw_-1l1oD3I'

export interface SupabaseConfig {
  url: string
  key: string
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()

  return {
    url: envUrl || DEFAULT_SUPABASE_URL,
    key: envKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  }
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

export async function saveRemoteState(client: SupabaseClient, _userId: string, state: CycleState): Promise<void> {
  const { error } = await client.rpc('save_user_app_state', { next_state: state })
  if (error) throw error
}

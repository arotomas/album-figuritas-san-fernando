import { createClient } from '@supabase/supabase-js'
import { getSupabaseProjectRef } from '../utils/authDebug'
import { sessionDebug, getSupabaseAuthStorageKey } from '../utils/sessionDebug'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const projectRef = getSupabaseProjectRef(supabaseUrl)

console.log('[SUPABASE-CHECK]', {
  url: supabaseUrl || '(missing)',
  project: projectRef ?? '(unknown)',
  source: 'src/lib/supabase.js',
  pathname: typeof window !== 'undefined' ? window.location.pathname : '(ssr)',
  mode: import.meta.env.MODE,
  urlConfigured: Boolean(supabaseUrl),
  keyConfigured: Boolean(supabaseAnonKey),
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: projectRef ? getSupabaseAuthStorageKey(projectRef) : undefined,
  },
})

console.info('[supabase] VITE_SUPABASE_URL configured', Boolean(supabaseUrl))
console.info('[supabase] VITE_SUPABASE_ANON_KEY configured', Boolean(supabaseAnonKey))
console.info('[supabase] URL in use', supabaseUrl || '(missing)')
console.info('[supabase] auth storageKey', projectRef ? getSupabaseAuthStorageKey(projectRef) : '(unknown)')

async function logSupabaseConnectionStatus() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[supabase] connection status: missing env vars')
    return
  }

  sessionDebug.info('client init — getSession probe')
  try {
    const { data, error } = await supabase.auth.getSession()
    sessionDebug.info('client init — getSession result', {
      hasSession: Boolean(data?.session),
      userId: data?.session?.user?.id ?? null,
      error: error?.message ?? null,
    })
  } catch (error) {
    sessionDebug.error('client init — getSession failed', {
      message: error?.message ?? String(error),
    })
  }
}

void logSupabaseConnectionStatus()

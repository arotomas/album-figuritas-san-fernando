import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('supabase connected')
console.info('[supabase] URL', supabaseUrl ?? '(missing)')

async function logSupabaseConnectionStatus() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[supabase] connection status: missing env vars')
    return
  }

  try {
    const { error } = await supabase.auth.getSession()
    if (error) {
      console.warn('[supabase] connection status: error', error.message)
      return
    }
    console.info('[supabase] connection status: ok')
  } catch (error) {
    console.warn('[supabase] connection status: failed', error?.message ?? error)
  }
}

void logSupabaseConnectionStatus()

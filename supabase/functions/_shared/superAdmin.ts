import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export async function assertSuperAdmin(req: Request): Promise<{
  user: { id: string }
  userClient: SupabaseClient
  adminClient: SupabaseClient
}> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('UNAUTHORIZED')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    throw new Error('UNAUTHORIZED')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'super_admin') {
    throw new Error('FORBIDDEN')
  }

  return { user, userClient, adminClient }
}

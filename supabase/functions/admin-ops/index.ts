import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify the calling user's JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  // Enforce admin/superadmin role at the DB level
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: profile } = await adminClient
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders })
  }

  let body: { action: string; userId?: string; email?: string; role?: string }
  try { body = await req.json() } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  try {
    if (body.action === 'invite') {
      const res = await fetch(`${supabaseUrl}/auth/v1/invite`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ email: body.email, data: { role: body.role } }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.msg ?? d.message ?? 'Invite failed')

    } else if (body.action === 'ban') {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${body.userId}`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({ ban_duration: '87600h' }),
      })
      if (!res.ok) throw new Error('Failed to suspend user')

    } else if (body.action === 'unban') {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${body.userId}`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({ ban_duration: 'none' }),
      })
      if (!res.ok) throw new Error('Failed to unsuspend user')

    } else {
      return new Response('Unknown action', { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

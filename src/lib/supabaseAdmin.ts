import { supabase } from '@/lib/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

async function callAdminOps(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-ops`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error ?? `Request failed (${res.status})`)
  }
}

export const adminAvailable = true

export async function inviteUser(email: string, role: string) {
  await callAdminOps({ action: 'invite', email, role })
}

export async function banUser(userId: string) {
  await callAdminOps({ action: 'ban', userId })
}

export async function unbanUser(userId: string) {
  await callAdminOps({ action: 'unban', userId })
}

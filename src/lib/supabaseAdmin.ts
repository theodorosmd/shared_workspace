const url = import.meta.env.VITE_SUPABASE_URL as string
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined

const h = (sk: string) => ({
  apikey: sk,
  Authorization: `Bearer ${sk}`,
  'Content-Type': 'application/json',
})

export const adminAvailable = !!serviceKey

export async function inviteUser(email: string, role: string) {
  if (!serviceKey) throw new Error('VITE_SUPABASE_SERVICE_KEY is not configured')
  const res = await fetch(`${url}/auth/v1/invite`, {
    method: 'POST',
    headers: h(serviceKey),
    body: JSON.stringify({ email, data: { role } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg ?? data.message ?? 'Invite failed')
}

export async function banUser(userId: string) {
  if (!serviceKey) throw new Error('VITE_SUPABASE_SERVICE_KEY is not configured')
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: h(serviceKey),
    body: JSON.stringify({ ban_duration: '87600h' }),
  })
  if (!res.ok) { const d = await res.json(); throw new Error(d.msg ?? 'Failed to suspend') }
}

export async function unbanUser(userId: string) {
  if (!serviceKey) throw new Error('VITE_SUPABASE_SERVICE_KEY is not configured')
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: h(serviceKey),
    body: JSON.stringify({ ban_duration: 'none' }),
  })
  if (!res.ok) { const d = await res.json(); throw new Error(d.msg ?? 'Failed to unsuspend') }
}

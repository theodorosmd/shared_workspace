// Lightweight Supabase access for the TV app.
//
// A live-only app makes a single read query, so we skip the full
// @supabase/supabase-js client (auth + realtime + storage) and call the
// PostgREST endpoint directly with fetch. Keeps the TV bundle small.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

/** Run a PostgREST GET query, e.g. restGet('channels?type=eq.live&select=*'). */
export async function restGet<T>(query: string): Promise<T> {
  if (!url || !key) throw new Error('Supabase is not configured')
  const res = await fetch(`${url}/rest/v1/${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Supabase request failed (${res.status})`)
  return (await res.json()) as T
}

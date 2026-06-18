import { useEffect, useState } from 'react'
import { isConfigured, restGet } from './supabase'

export interface LiveChannel {
  id: string
  name: string
  description: string | null
  stream_url: string
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; channel: LiveChannel }
  | { status: 'error'; message: string }

const FALLBACK_URL = import.meta.env.VITE_LIVE_STREAM_URL as string | undefined

function fallbackChannel(): LiveChannel | null {
  if (!FALLBACK_URL) return null
  return { id: 'fallback', name: 'Suryoyo Sat', description: 'Live', stream_url: FALLBACK_URL }
}

// First active live channel with a stream, by sort_order.
const QUERY =
  'channels?type=eq.live&status=eq.active&stream_url=not.is.null' +
  '&select=id,name,description,stream_url&order=sort_order.asc&limit=1'

/**
 * Loads the active live channel from the shared Supabase `channels` table.
 * Falls back to VITE_LIVE_STREAM_URL when the DB is unavailable or empty.
 */
export function useLiveChannel(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    function resolveFallback(message: string) {
      if (cancelled) return
      const fb = fallbackChannel()
      setState(fb ? { status: 'ready', channel: fb } : { status: 'error', message })
    }

    async function load() {
      if (!isConfigured) {
        resolveFallback('No Supabase config and no fallback stream URL set.')
        return
      }
      try {
        const rows = await restGet<LiveChannel[]>(QUERY)
        if (cancelled) return
        const channel = rows[0]
        if (!channel?.stream_url) {
          resolveFallback('No active live channel found in Suryoyo Sat.')
          return
        }
        setState({ status: 'ready', channel })
      } catch (err) {
        resolveFallback(err instanceof Error ? err.message : 'Failed to load live channel.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

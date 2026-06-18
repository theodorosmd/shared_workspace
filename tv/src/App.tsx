import { useCallback, useEffect, useRef, useState } from 'react'
import LivePlayer from './LivePlayer'
import { useLiveChannel } from './useLiveChannel'
import { resolveTvKey, registerTizenKeys, exitApp } from './tvKeys'

export default function App() {
  const state = useLiveChannel()
  const [fatal, setFatal] = useState<string | null>(null)
  const [infoVisible, setInfoVisible] = useState(true)
  const hideTimer = useRef<number | undefined>(undefined)

  // Auto-hide the channel banner a few seconds after it appears.
  const flashInfo = useCallback(() => {
    setInfoVisible(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setInfoVisible(false), 5000)
  }, [])

  useEffect(() => {
    registerTizenKeys()
    flashInfo()

    // Best-effort: keep the screen awake during playback.
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<unknown> } }
    nav.wakeLock?.request('screen').catch(() => {})

    const onKey = (e: KeyboardEvent) => {
      const key = resolveTvKey(e)
      if (!key) return
      if (key === 'back') {
        if (infoVisible) setInfoVisible(false)
        else exitApp()
        return
      }
      // Any other remote press reveals the channel banner.
      flashInfo()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(hideTimer.current)
    }
  }, [flashInfo, infoVisible])

  if (state.status === 'loading') {
    return (
      <main className="stage">
        <div className="center">
          <div className="spinner" />
          <p className="muted">Loading Suryoyo Sat…</p>
        </div>
      </main>
    )
  }

  if (fatal || state.status === 'error') {
    const message = fatal ?? (state.status === 'error' ? state.message : 'Unknown error')
    return (
      <main className="stage">
        <div className="center">
          <h1 className="brand">SURYOYO&nbsp;SAT</h1>
          <p className="error">{message}</p>
          <button className="retry" autoFocus onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </main>
    )
  }

  const channel = state.channel
  return (
    <main className="stage" onClick={flashInfo}>
      <LivePlayer src={channel.stream_url} onFatal={setFatal} />

      <div className={`banner ${infoVisible ? 'show' : ''}`}>
        <span className="live-dot" />
        <span className="live-label">LIVE</span>
        <div className="banner-text">
          <span className="ch-name">{channel.name}</span>
          {channel.description && <span className="ch-sub">{channel.description}</span>}
        </div>
      </div>
    </main>
  )
}

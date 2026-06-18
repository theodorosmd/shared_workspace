import { useCallback, useEffect, useRef, useState } from 'react'
import LivePlayer from './LivePlayer'
import { CHANNEL } from './config'
import { resolveTvKey, registerTizenKeys, exitApp } from './tvKeys'

export default function App() {
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

  const message = fatal ?? (CHANNEL.streamUrl ? null : 'No live stream URL configured. Set VITE_LIVE_STREAM_URL.')
  if (message) {
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

  return (
    <main className="stage" onClick={flashInfo}>
      <LivePlayer src={CHANNEL.streamUrl} onFatal={setFatal} />

      <div className={`banner ${infoVisible ? 'show' : ''}`}>
        <span className="live-dot" />
        <span className="live-label">LIVE</span>
        <div className="banner-text">
          <span className="ch-name">{CHANNEL.name}</span>
          {CHANNEL.description && <span className="ch-sub">{CHANNEL.description}</span>}
        </div>
      </div>
    </main>
  )
}

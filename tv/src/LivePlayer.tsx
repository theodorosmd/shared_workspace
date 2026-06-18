import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface Props {
  src: string
  onFatal: (message: string) => void
}

/**
 * Full-screen HLS live player.
 * Prefers the platform's native HLS (Safari / tvOS / many Tizen & webOS sets),
 * and falls back to hls.js (Chromium-based smart-TV browsers, Fire TV).
 */
export default function LivePlayer({ src, onFatal }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== ''

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay with sound blocked — retry muted so the picture still shows.
        video.muted = true
        setMuted(true)
        video.play().catch(() => {})
      })
    }

    if (nativeHls) {
      video.src = src
      video.addEventListener('loadedmetadata', tryPlay, { once: true })
    } else if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3, enableWorker: true })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay)
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls?.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls?.recoverMediaError()
            break
          default:
            onFatal('Playback error — the live stream is unavailable.')
        }
      })
    } else {
      onFatal('This device cannot play the live stream (no HLS support).')
      return
    }

    return () => {
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [src, onFatal])

  return (
    <video
      ref={videoRef}
      className="player"
      playsInline
      autoPlay
      muted={muted}
      // poster keeps the screen from flashing white before the first frame
      poster=""
    />
  )
}

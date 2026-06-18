// Suryoyo Sat live stream — no login or backend required.
//
// Default is the Castr master HLS playlist (multi-bitrate: 360p–1080p, so the
// player adapts quality automatically). Override with the VITE_LIVE_STREAM_URL
// env var if the source ever changes.

const DEFAULT_STREAM_URL =
  'https://stream-hls.castr.net/66c326077b2f5e54001a1b38/live_e7ebb6206aa411efb410076c4d9f632e/playlist.m3u8'

export const CHANNEL = {
  name: 'Suryoyo Sat',
  description: 'Live',
  streamUrl: (import.meta.env.VITE_LIVE_STREAM_URL as string | undefined)?.trim() || DEFAULT_STREAM_URL,
}

// Suryoyo Sat live stream — no login or backend required.
//
// Provide the live HLS (.m3u8) URL via the VITE_LIVE_STREAM_URL env var
// (see .env.example), or paste it directly into `streamUrl` below.
//
// Tip: Suryoyo Sat broadcasts through Castr — copy the HLS / embed URL from the
// Castr dashboard (it looks like https://stream.castr.com/<id>/playlist.m3u8).

export const CHANNEL = {
  name: 'Suryoyo Sat',
  description: 'Live',
  streamUrl: (import.meta.env.VITE_LIVE_STREAM_URL as string | undefined)?.trim() || '',
}

# Suryoyo Sat — Live TV app

A minimal, **live-only** Smart TV app: one full-screen screen that plays the
Suryoyo Sat live broadcast. Built once with React + Vite + TypeScript and
packaged for **Samsung Tizen**, **LG webOS**, **Amazon Fire TV**, and any
browser. Native shells for **Android TV**, **Apple TV (tvOS)** and **Roku** are
described at the bottom (they cannot share this web codebase).

## How the live stream is sourced

The app does **not** hardcode a stream URL. It reads the active live channel
from the same Supabase project the admin app uses:

```
channels  →  first row where type = 'live' AND status = 'active'  (by sort_order)
          →  plays its stream_url
```

So whoever manages the admin panel sets/changes the live URL — no app rebuild
needed. If Supabase is unreachable or has no active live channel, the app falls
back to `VITE_LIVE_STREAM_URL` (handy for local testing).

### Required Supabase change (public read)

The admin schema only lets **authenticated** users read `channels`. A public TV
app uses the anonymous key, so add a read policy for the live channel:

```sql
create policy "anon_read_active_live_channels"
  on public.channels
  for select
  to anon
  using (status = 'active' and type = 'live');
```

Writes stay admin-only. Consider fronting this with a CDN-cached Edge Function
later — TVs hit the backend in prime-time bursts.

## Develop

```bash
cd tv
cp .env.example .env        # fill in Supabase URL + anon key (or just VITE_LIVE_STREAM_URL)
npm install
npm run dev                 # open the printed URL; resize to a 16:9 window to simulate a TV
npm run typecheck           # strict TS check
npm run build               # outputs ./dist (relative asset paths, ready to package)
```

Test remote-control behaviour with the keyboard: **Arrows** reveal the channel
banner, **Backspace** acts as Back/exit.

## Package per platform

All three web platforms consume the same `dist/` build.

**Samsung Tizen** — needs [Tizen Studio / CLI]:
```bash
npm run build
cp platform/tizen/config.xml dist/ && cp platform/tizen/icon.png dist/
tizen build-web -- dist
tizen package -t wgt -s <cert-profile> -- dist/.buildResult   # → .wgt
```

**LG webOS** — needs the [webOS TV CLI (`ares`)]:
```bash
npm run build
cp platform/webos/appinfo.json dist/ && cp platform/webos/icon*.png dist/
ares-package dist                                              # → .ipk
ares-install ./com.suryoyosat.tv_0.1.0_all.ipk -d <tv>
```

**Amazon Fire TV** — host `dist/` over HTTPS and submit a **Web App** in the
Amazon Appstore Developer Console (or wrap it in a WebView Android app). Fire TV
remotes already send standard DOM keycodes, so no extra work.

## Native platforms (separate codebases)

These can't reuse the web build; the recommended approach for a live-only app:

- **Android TV / Google TV** — fastest path: a thin Kotlin app whose only
  Activity hosts a full-screen `WebView` pointing at the hosted `dist/` (or an
  ExoPlayer screen reading the same Supabase row). Submit on the Play Console
  Android TV track.
- **Apple TV (tvOS)** — SwiftUI app with `AVPlayer` playing the HLS URL fetched
  from Supabase via its REST endpoint. Requires the Apple Developer Program.
- **Roku** — BrightScript/SceneGraph channel using a `Video` node; fetch the
  live URL from Supabase REST. Submit via the Roku Developer portal.

All three only need the live `stream_url`, which they can read from the same
Supabase table over its REST API with the anon key.
```
GET {VITE_SUPABASE_URL}/rest/v1/channels?type=eq.live&status=eq.active&select=stream_url&order=sort_order&limit=1
apikey: {anon key}
```

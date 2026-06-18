# Suryoyo Sat — Live TV app

A minimal, **live-only** Smart TV app: one full-screen screen that plays the
Suryoyo Sat live broadcast. **No login, no backend, no authentication** — it
just plays an HLS stream. Built once with React + Vite + TypeScript and packaged
for **Samsung Tizen**, **LG webOS**, **Amazon Fire TV**, and any browser. Native
shells for **Android TV**, **Apple TV (tvOS)** and **Roku** are described at the
bottom (they cannot share this web codebase).

## Configure the stream

The app plays a single HLS (`.m3u8`) URL. Set it either way:

- **Env var:** copy `.env.example` to `.env` and set `VITE_LIVE_STREAM_URL`, or
- **Hardcode:** paste it into `streamUrl` in `src/config.ts`.

Suryoyo Sat broadcasts through **Castr**, so copy the HLS / embed URL from the
Castr dashboard (it looks like `https://stream.castr.com/<id>/playlist.m3u8`).

## Develop

```bash
cd tv
cp .env.example .env        # set VITE_LIVE_STREAM_URL
npm install
npm run dev                 # open the printed URL; resize to a 16:9 window to simulate a TV
npm run typecheck           # strict TS check
npm run build               # outputs ./dist (relative asset paths, ready to package)
```

Test remote-control behaviour with the keyboard: **Arrows** reveal the channel
banner, **Backspace** acts as Back/exit.

## Package per platform

All three web platforms consume the same `dist/` build.

**Samsung Tizen** — needs Tizen Studio / CLI:
```bash
npm run build
cp platform/tizen/config.xml dist/ && cp platform/tizen/icon.png dist/
tizen build-web -- dist
tizen package -t wgt -s <cert-profile> -- dist/.buildResult   # → .wgt
```

**LG webOS** — needs the webOS TV CLI (`ares`):
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

These can't reuse the web build. For a live-only app the simplest path:

- **Android TV / Google TV** — a thin Kotlin app whose only Activity is a
  full-screen `WebView` pointing at the hosted `dist/`, or an ExoPlayer screen
  pointed at the same HLS URL. Submit on the Play Console Android TV track.
- **Apple TV (tvOS)** — SwiftUI app with `AVPlayer` playing the HLS URL.
  Requires the Apple Developer Program.
- **Roku** — BrightScript/SceneGraph channel using a `Video` node pointed at the
  HLS URL. Submit via the Roku Developer portal.

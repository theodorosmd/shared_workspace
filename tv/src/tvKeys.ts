// Remote-control key handling normalised across TV platforms.
//
// Browsers/Fire TV use standard DOM keyCodes; Samsung Tizen and LG webOS expose
// extra codes for colour buttons, media keys and a hardware Back button.

export type TvKey = 'ok' | 'back' | 'up' | 'down' | 'left' | 'right' | 'playpause'

const MAP: Record<number, TvKey> = {
  13: 'ok',        // Enter / OK
  8: 'back',       // Backspace (browser / Fire TV)
  461: 'back',     // LG webOS Back
  10009: 'back',   // Samsung Tizen Return
  38: 'up',
  40: 'down',
  37: 'left',
  39: 'right',
  179: 'playpause',   // media Play/Pause
  10252: 'playpause', // Tizen MediaPlayPause
  415: 'playpause',   // Play
}

export function resolveTvKey(e: KeyboardEvent): TvKey | null {
  return MAP[e.keyCode] ?? null
}

// Samsung TVs require explicitly registering the keys the app wants to receive.
export function registerTizenKeys(): void {
  const tizen = (window as unknown as { tizen?: { tvinputdevice?: { registerKey(k: string): void } } }).tizen
  if (!tizen?.tvinputdevice) return
  for (const k of ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop']) {
    try {
      tizen.tvinputdevice.registerKey(k)
    } catch {
      /* key not available on this model — ignore */
    }
  }
}

// Close the app on the hardware Back button (platform-specific exit hooks).
export function exitApp(): void {
  const w = window as unknown as {
    tizen?: { application?: { getCurrentApplication(): { exit(): void } } }
    webOS?: { platformBack?: () => void }
  }
  if (w.tizen?.application) {
    w.tizen.application.getCurrentApplication().exit()
  } else if (w.webOS?.platformBack) {
    w.webOS.platformBack()
  } else {
    window.history.back()
  }
}

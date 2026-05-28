import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

export const tokens = {
  dark: {
    bg:              '#080a0f',
    surface:         '#0d1117',
    surfaceHover:    '#0a0f18',
    border:          '#0f1923',
    borderStrong:    '#1a2233',
    text:            '#f1f5f9',
    textSub:         '#94a3b8',
    textMuted:       '#475569',
    textGhost:       '#334155',
    accent:          '#2563eb',
    accentHover:     '#1d4ed8',
    navActive:       '#111827',
    navActiveText:   '#e2e8f0',
    navText:         '#475569',
    input:           '#0d1117',
    inputBorder:     '#1e2229',
    inputText:       '#e2e8f0',
    inputPlaceholder:'#334155',
    danger:          'rgba(239,68,68,0.06)',
    dangerText:      '#ef4444',
    statCard:        '#0d1117',
    statBorder:      '#1a2233',
  },
  light: {
    bg:              '#f5f5f7',
    surface:         '#ffffff',
    surfaceHover:    '#f8fafc',
    border:          '#f0f0f0',
    borderStrong:    '#e2e8f0',
    text:            '#0f172a',
    textSub:         '#334155',
    textMuted:       '#64748b',
    textGhost:       '#94a3b8',
    accent:          '#2563eb',
    accentHover:     '#1d4ed8',
    navActive:       '#eff6ff',
    navActiveText:   '#1d4ed8',
    navText:         '#64748b',
    input:           '#ffffff',
    inputBorder:     '#e2e8f0',
    inputText:       '#0f172a',
    inputPlaceholder:'#94a3b8',
    danger:          'rgba(239,68,68,0.06)',
    dangerText:      '#ef4444',
    statCard:        '#ffffff',
    statBorder:      '#f0f0f0',
  },
}

type ThemeCtx = { theme: Theme; t: typeof tokens.dark; toggle: () => void }
const Ctx = createContext<ThemeCtx>({} as ThemeCtx)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) ?? 'dark'
  )
  const toggle = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    return next
  })
  const t = tokens[theme]

  useEffect(() => {
    document.body.style.background = t.bg
  }, [t.bg])

  return <Ctx.Provider value={{ theme, t, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

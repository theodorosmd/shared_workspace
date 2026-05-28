import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

interface Command {
  id: string
  label: string
  hint?: string
  key?: string
  run: () => void
  group: string
}

function isTyping() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const { t, theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => { setOpen(false); setQuery(''); setActive(0) }, [])

  const commands: Command[] = [
    { id: 'dashboard', label: 'Go to Dashboard', key: 'D', group: 'Navigation', run: () => navigate('/') },
    { id: 'countries', label: 'Go to Countries', key: 'C', group: 'Navigation', run: () => navigate('/countries') },
    { id: 'users', label: 'Go to Users', key: 'U', group: 'Navigation', run: () => navigate('/users') },
    { id: 'programs', label: 'Go to Programs', key: 'P', group: 'Navigation', run: () => navigate('/programs') },
    { id: 'roles', label: 'Go to Settings / Roles', key: 'R', group: 'Navigation', run: () => navigate('/settings/roles') },
    { id: 'support', label: 'Go to Support', key: 'S', group: 'Navigation', run: () => navigate('/support') },
    { id: 'theme', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', group: 'Actions', run: () => toggle() },
    { id: 'logout', label: 'Log out', group: 'Actions', run: async () => { await supabase.auth.signOut(); navigate('/login') } },
  ]

  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  // Global keyboard handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K toggles palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (open) {
        if (e.key === 'Escape') { e.preventDefault(); close() }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
        else if (e.key === 'Enter') {
          e.preventDefault()
          const cmd = filtered[active]
          if (cmd) { cmd.run(); close() }
        }
        return
      }
      // Single-key shortcuts (only when not typing, no modifier, no open overlay)
      if (!isTyping() && !e.metaKey && !e.ctrlKey && !e.altKey && !document.querySelector('[data-overlay]')) {
        const map: Record<string, string> = { c: '/countries', p: '/programs', s: '/support', r: '/settings/roles', d: '/', u: '/users' }
        const dest = map[e.key.toLowerCase()]
        if (dest) { e.preventDefault(); navigate(dest) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, active, filtered, close, navigate])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20)
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  if (!open) return null

  let lastGroup = ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, paddingTop: '12vh', animation: 'fadeIn 0.12s ease' }}
      onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, margin: '0 16px', background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
          <svg width="16" height="16" fill="none" stroke={t.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command or search…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: 14, fontFamily: 'inherit' }} />
          <span style={{ fontSize: 10, color: t.textGhost, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: '2px 6px' }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No results</div>
          )}
          {filtered.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup
            lastGroup = cmd.group
            return (
              <div key={cmd.id}>
                {showGroup && <p style={{ padding: '8px 10px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textGhost }}>{cmd.group}</p>}
                <div
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { cmd.run(); close() }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 7, cursor: 'pointer', background: active === i ? (theme === 'dark' ? '#1a2233' : '#eff6ff') : 'transparent', color: active === i ? t.text : t.textSub, fontSize: 13 }}
                >
                  <span>{cmd.label}</span>
                  {cmd.key && <span style={{ fontSize: 10, color: t.textGhost, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: '1px 6px' }}>{cmd.key}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

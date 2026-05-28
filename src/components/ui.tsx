import { useTheme } from '@/lib/theme'

export function PageHeader({ title, sub, action, onAction }: { title: string; sub: string; action?: string; onAction?: () => void }) {
  const { t } = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
      <div>
        <h1 style={{ color: t.text, fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>{title}</h1>
        <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>{sub}</p>
      </div>
      {action && onAction && (
        <button onClick={onAction} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#2563eb', border: 'none', borderRadius: 7, color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.01em' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          {action}
        </button>
      )}
    </div>
  )
}

export function Table({ cols, rows, loading, empty }: { cols: string[]; rows: React.ReactNode[][]; loading?: boolean; empty?: string }) {
  const { t } = useTheme()
  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
  if (rows.length === 0) return <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>{empty ?? 'No data.'}</div>
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ textAlign: 'left', padding: '11px 18px', color: t.textMuted, fontWeight: 500, borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '12px 18px', color: t.textSub }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({ title, children, onClose, onSave, saveLabel = 'Save', saving }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saveLabel?: string; saving?: boolean }) {
  const { t } = useTheme()
  return (
    <div data-overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, animation: 'fadeIn 0.15s ease' }}
      onClick={() => !saving && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, width: '100%', maxWidth: 440, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ color: t.text, fontSize: 16, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.2px' }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textSub, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 7, border: 'none', background: saving ? '#1d4ed8' : '#2563eb', color: 'white', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, value, onChange, placeholder, type = 'text', multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; multiline?: boolean }) {
  const { t } = useTheme()
  const base: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: t.input,
    border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.inputText,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6, letterSpacing: '0.02em' }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...base, resize: 'none' }}
            onFocus={e => (e.target.style.borderColor = '#3b82f6')}
            onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base}
            onFocus={e => (e.target.style.borderColor = '#3b82f6')}
            onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
      }
    </div>
  )
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const { t } = useTheme()
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.inputText, fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function ActionBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  const { t } = useTheme()
  return (
    <button onClick={onClick} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: danger ? t.dangerText : t.textMuted, fontSize: 12, cursor: 'pointer', transition: 'all 0.1s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = danger ? t.danger : t.surfaceHover }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >{label}</button>
  )
}

export function Badge({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
    violet: { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa' },
    green:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
    amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24' },
    red:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
    slate:  { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
  }
  const c = colorMap[color] ?? colorMap.slate
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: c.bg, color: c.text, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em' }}>
      {label}
    </span>
  )
}

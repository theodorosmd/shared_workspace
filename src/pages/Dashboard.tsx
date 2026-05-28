import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

interface Stats { countries: number; users: number; programs: number; openTickets: number }

export default function Dashboard() {
  const { t } = useTheme()
  const [stats, setStats] = useState<Stats>({ countries: 0, users: 0, programs: 0, openTickets: 0 })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email?.split('@')[0] ?? 'Admin'))
    Promise.all([
      supabase.from('countries').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('programs').select('id', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]).then(([c, u, p, tk]) => {
      setStats({ countries: c.count ?? 0, users: u.count ?? 0, programs: p.count ?? 0, openTickets: tk.count ?? 0 })
      setLoading(false)
    })
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const shortcuts = [
    { label: 'Add country', to: '/countries', key: 'C' },
    { label: 'Upload program', to: '/programs', key: 'P' },
    { label: 'Open tickets', to: '/support', key: 'S' },
    { label: 'Manage roles', to: '/settings/roles', key: 'R' },
  ]

  return (
    <div style={{ minHeight: '100%', background: t.bg, padding: '48px', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ color: t.textGhost, fontSize: 13, margin: '0 0 6px', letterSpacing: '0.02em' }}>{greeting}</p>
        <h1 style={{ color: t.text, fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px', margin: 0 }}>{user}</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 48 }}>
        {[
          { label: 'Countries', value: stats.countries },
          { label: 'Users', value: stats.users },
          { label: 'Programs', value: stats.programs },
          { label: 'Open tickets', value: stats.openTickets },
        ].map(s => (
          <div key={s.label} style={{ background: t.statCard, border: `1px solid ${t.statBorder}`, borderRadius: 12, padding: '20px 24px' }}>
            <p style={{ color: t.textMuted, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>{s.label}</p>
            <p style={{ color: t.text, fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', margin: '8px 0 0', lineHeight: 1 }}>
              {loading ? '—' : s.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, marginBottom: 40 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Quick actions */}
        <div>
          <p style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Quick actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shortcuts.map(s => (
              <a key={s.to} href={s.to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', color: t.textSub, fontSize: 13, transition: 'all 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.surfaceHover; (e.currentTarget as HTMLElement).style.color = t.text }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = t.textSub }}
              >
                <span>{s.label}</span>
                <span style={{ fontSize: 10, color: t.textGhost, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>{s.key}</span>
              </a>
            ))}
          </div>
        </div>

        {/* System status */}
        <div>
          <p style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>System</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['API', 'Database', 'Storage', 'Auth'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', color: t.textMuted, fontSize: 13 }}>
                <span>{item}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e55' }} />
                  <span style={{ color: '#22c55e', fontSize: 11 }}>Operational</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

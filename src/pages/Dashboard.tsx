import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  countries: number
  users: number
  programs: number
  openTickets: number
}

function StatCard({ label, value, delta }: { label: string; value: number | string; delta?: string }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1a2233',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <p style={{ color: '#475569', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', margin: '8px 0 0', lineHeight: 1 }}>{value}</p>
      {delta && <p style={{ color: '#22c55e', fontSize: 11, marginTop: 8, letterSpacing: '0.02em' }}>{delta}</p>}
    </div>
  )
}

const shortcuts = [
  { label: 'Add country', to: '/countries', key: 'C' },
  { label: 'Upload program', to: '/programs', key: 'P' },
  { label: 'Open tickets', to: '/support', key: 'S' },
  { label: 'Manage roles', to: '/settings/roles', key: 'R' },
]

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ countries: 0, users: 0, programs: 0, openTickets: 0 })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user?.email?.split('@')[0] ?? 'Admin')
    })

    async function fetchStats() {
      const [countries, users, programs, tickets] = await Promise.all([
        supabase.from('countries').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('programs').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])
      setStats({
        countries: countries.count ?? 0,
        users: users.count ?? 0,
        programs: programs.count ?? 0,
        openTickets: tickets.count ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{
      minHeight: '100%',
      background: '#080a0f',
      padding: '48px 48px 80px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ color: '#334155', fontSize: 13, margin: '0 0 6px', letterSpacing: '0.02em' }}>
          {greeting}
        </p>
        <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px', margin: 0 }}>
          {user}
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 48 }}>
        <StatCard label="Countries" value={loading ? '—' : stats.countries} />
        <StatCard label="Users" value={loading ? '—' : stats.users} />
        <StatCard label="Programs" value={loading ? '—' : stats.programs} />
        <StatCard label="Open tickets" value={loading ? '—' : stats.openTickets} />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #0f1923', marginBottom: 40 }} />

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Quick actions */}
        <div>
          <p style={{ color: '#334155', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Quick actions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shortcuts.map(s => (
              <a
                key={s.to}
                href={s.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#94a3b8',
                  fontSize: 13,
                  transition: 'background 0.1s, color 0.1s',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#0d1117'
                  ;(e.currentTarget as HTMLElement).style.color = '#e2e8f0'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
                }}
              >
                <span>{s.label}</span>
                <span style={{
                  fontSize: 10,
                  color: '#1e2a3a',
                  background: '#0d1117',
                  border: '1px solid #1a2233',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                }}>
                  {s.key}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* System */}
        <div>
          <p style={{ color: '#334155', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            System
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['API', 'Database', 'Storage', 'Auth'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', color: '#475569', fontSize: 13 }}>
                <span>{item}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
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

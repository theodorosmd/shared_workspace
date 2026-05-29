import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { MiniBarChart, SegmentedBar } from '@/components/Charts'

interface Stats { countries: number; users: number; programs: number; openTickets: number }
interface AuditEntry { id: string; action: string; entity_type: string; entity_name: string | null; actor_email: string | null; created_at: string }

function groupByMonth(items: { created_at: string }[]) {
  const now = new Date()
  const months: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en', { month: 'short' }) })
  }
  const counts: Record<string, number> = {}
  months.forEach(m => { counts[m.key] = 0 })
  items.forEach(item => {
    const key = item.created_at.slice(0, 7)
    if (key in counts) counts[key]++
  })
  return months.map(m => ({ label: m.label, value: counts[m.key] }))
}

function fmtTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function Dashboard() {
  const { t } = useTheme()
  const { toast } = useFeedback()
  const [stats, setStats] = useState<Stats>({ countries: 0, users: 0, programs: 0, openTickets: 0 })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState('')
  const [userMonths, setUserMonths] = useState<{ label: string; value: number }[]>([])
  const [programMonths, setProgramMonths] = useState<{ label: string; value: number }[]>([])
  const [ticketStatus, setTicketStatus] = useState({ open: 0, in_progress: 0, resolved: 0 })
  const [activity, setActivity] = useState<AuditEntry[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email?.split('@')[0] ?? 'Admin'))

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    Promise.all([
      supabase.from('countries').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('programs').select('id', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('profiles').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
      supabase.from('programs').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
      supabase.from('support_tickets').select('status'),
      supabase.from('audit_logs').select('id, action, entity_type, entity_name, actor_email, created_at').order('created_at', { ascending: false }).limit(10),
    ]).then(([c, u, p, tk, uHist, pHist, tks, logs]) => {
      if (c.error || u.error || p.error || tk.error) toast('Failed to load stats', 'error')
      setStats({ countries: c.count ?? 0, users: u.count ?? 0, programs: p.count ?? 0, openTickets: tk.count ?? 0 })
      setUserMonths(groupByMonth(uHist.data ?? []))
      setProgramMonths(groupByMonth(pHist.data ?? []))
      const tc = { open: 0, in_progress: 0, resolved: 0 }
      ;(tks.data ?? []).forEach((x: { status: string }) => { if (x.status in tc) tc[x.status as keyof typeof tc]++ })
      setTicketStatus(tc)
      setActivity(logs.data ?? [])
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

  const ticketTotal = ticketStatus.open + ticketStatus.in_progress + ticketStatus.resolved

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: t.textGhost, fontSize: 13, margin: '0 0 6px', letterSpacing: '0.02em' }}>{greeting}</p>
          <h1 style={{ color: t.text, fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px', margin: 0 }}>{user}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.textMuted, fontSize: 12, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 7, padding: '6px 10px' }}>
          <span>Press</span>
          <span style={{ color: t.textSub, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>⌘K</span>
          <span>for commands</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
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

      {/* Charts */}
      <div className="charts-grid" style={{ marginBottom: 48 }}>
        <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ color: t.textMuted, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px' }}>New users / month</p>
          <MiniBarChart data={userMonths.length > 0 ? userMonths : Array(6).fill({ label: '', value: 0 })} color="#3b82f6" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {userMonths.map(d => <span key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: t.textGhost }}>{d.label}</span>)}
          </div>
        </div>

        <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ color: t.textMuted, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px' }}>Tickets by status</p>
          <SegmentedBar segments={[
            { label: 'Open', value: ticketStatus.open, color: '#fbbf24' },
            { label: 'In progress', value: ticketStatus.in_progress, color: '#60a5fa' },
            { label: 'Resolved', value: ticketStatus.resolved, color: '#4ade80' },
          ]} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {[
              { label: 'Open', value: ticketStatus.open, color: '#fbbf24' },
              { label: 'In progress', value: ticketStatus.in_progress, color: '#60a5fa' },
              { label: 'Resolved', value: ticketStatus.resolved, color: '#4ade80' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: 11, color: t.textMuted }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 11, color: t.textGhost }}>
                  {s.value} ({ticketTotal > 0 ? Math.round((s.value / ticketTotal) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ color: t.textMuted, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px' }}>Programs / month</p>
          <MiniBarChart data={programMonths.length > 0 ? programMonths : Array(6).fill({ label: '', value: 0 })} color="#a78bfa" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {programMonths.map(d => <span key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: t.textGhost }}>{d.label}</span>)}
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, marginBottom: 40 }} />

      <div className="two-col">
        {/* Quick actions */}
        <div>
          <p style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Quick actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shortcuts.map(s => (
              <Link key={s.to} to={s.to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', color: t.textSub, fontSize: 13, transition: 'all 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.surfaceHover; (e.currentTarget as HTMLElement).style.color = t.text }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = t.textSub }}
              >
                <span>{s.label}</span>
                <span style={{ fontSize: 10, color: t.textGhost, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>{s.key}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Recent activity</p>
            <Link to="/audit" style={{ color: t.textMuted, fontSize: 11, textDecoration: 'none' }}>View all →</Link>
          </div>
          {activity.length === 0 ? (
            <p style={{ color: t.textGhost, fontSize: 12, padding: '10px 14px' }}>No activity yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {activity.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                  <p style={{ color: t.textSub, fontSize: 12, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: t.text, fontWeight: 500 }}>{a.actor_email?.split('@')[0] ?? 'System'}</span>
                    {' '}{a.action.replace(/_/g, ' ')}
                    {a.entity_name && <span style={{ color: t.textMuted }}> {a.entity_name}</span>}
                  </p>
                  <span style={{ color: t.textGhost, fontSize: 11, flexShrink: 0 }}>{fmtTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

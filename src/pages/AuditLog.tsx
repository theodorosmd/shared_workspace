import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader } from '@/components/ui'

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  actor_email: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  created: '#4ade80', updated: '#60a5fa', deleted: '#f87171',
  invited: '#a78bfa', suspended: '#fbbf24', unsuspended: '#4ade80',
  assigned: '#60a5fa', status_changed: '#60a5fa', replied: '#a78bfa',
  role_changed: '#fbbf24', uploaded: '#4ade80',
}

function fmtTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function AuditLog() {
  const { t } = useTheme()
  const { toast } = useFeedback()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter !== 'all') q = q.eq('entity_type', filter)
    q.then(({ data, error }) => {
      if (error) toast(error.message, 'error')
      setLogs(data ?? [])
      setLoading(false)
    })
  }, [filter])

  const entityTypes = ['all', 'user', 'program', 'ticket', 'country', 'role']

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Audit Log" sub="Complete history of admin actions" />

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {entityTypes.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${filter === f ? '#2563eb' : t.borderStrong}`,
            background: filter === f ? '#2563eb' : 'transparent',
            color: filter === f ? 'white' : t.textMuted,
            fontSize: 12, cursor: 'pointer', transition: 'all 0.1s', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No activity yet.</div>
      ) : (
        <div className="table-wrap" style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr>
                {['When', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 18px', color: t.textMuted, fontWeight: 500, borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const ac = ACTION_COLOR[log.action] ?? '#94a3b8'
                return (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: '10px 18px', color: t.textGhost, whiteSpace: 'nowrap' }}>{fmtTime(log.created_at)}</td>
                    <td style={{ padding: '10px 18px', color: t.textSub }}>{log.actor_email ?? '—'}</td>
                    <td style={{ padding: '10px 18px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, background: ac + '22', color: ac, fontWeight: 500 }}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 18px' }}>
                      <span style={{ fontWeight: 500, color: t.text }}>{log.entity_name ?? log.entity_id ?? '—'}</span>
                      <span style={{ color: t.textGhost, fontSize: 11, marginLeft: 6, textTransform: 'capitalize' }}>{log.entity_type}</span>
                    </td>
                    <td style={{ padding: '10px 18px', color: t.textGhost, fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {Object.keys(log.metadata ?? {}).length > 0 ? JSON.stringify(log.metadata).slice(0, 70) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

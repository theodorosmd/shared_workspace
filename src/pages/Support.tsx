import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { PageHeader, Modal, Field, Select } from '@/components/ui'

interface Ticket { id: string; subject: string; message: string; status: 'open' | 'in_progress' | 'resolved'; priority: 'low' | 'medium' | 'high'; employee_email: string; created_at: string }

const STATUS_COLOR: Record<string, string> = { open: 'amber', in_progress: 'blue', resolved: 'green' }
const PRIORITY_COLOR: Record<string, string> = { low: 'slate', medium: 'amber', high: 'red' }

function Dot({ color }: { color: string }) {
  const map: Record<string, string> = { amber: '#fbbf24', blue: '#60a5fa', green: '#4ade80', red: '#f87171', slate: '#94a3b8' }
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: map[color] ?? map.slate, marginRight: 5 }} />
}

export default function Support() {
  const { t } = useTheme()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium', employee_email: '' })

  const fetch = async () => {
    let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q; setTickets(data ?? []); setLoading(false)
  }
  useEffect(() => { fetch() }, [filter])

  const changeStatus = async (id: string, status: string) => {
    await supabase.from('support_tickets').update({ status }).eq('id', id)
    setTickets(p => p.map(t => t.id === id ? { ...t, status: status as Ticket['status'] } : t))
    if (selected?.id === id) setSelected(s => s ? { ...s, status: status as Ticket['status'] } : s)
  }

  const create = async () => {
    await supabase.from('support_tickets').insert({ ...form, status: 'open' })
    setOpen(false); setForm({ subject: '', message: '', priority: 'medium', employee_email: '' }); fetch()
  }

  const filters = ['all', 'open', 'in_progress', 'resolved']

  return (
    <div style={{ minHeight: '100%', background: t.bg, padding: 48, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Support" sub="Employee support tickets" action="New Ticket" onAction={() => setOpen(true)} />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${filter === f ? '#2563eb' : t.borderStrong}`,
            background: filter === f ? '#2563eb' : 'transparent', color: filter === f ? 'white' : t.textMuted,
            fontSize: 12, cursor: 'pointer', transition: 'all 0.1s', fontWeight: filter === f ? 500 : 400,
          }}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No tickets.</div>
          ) : tickets.map(tk => (
            <div key={tk.id} onClick={() => setSelected(tk)} style={{
              background: selected?.id === tk.id ? t.surface : t.bg,
              border: `1px solid ${selected?.id === tk.id ? '#2563eb44' : t.borderStrong}`,
              borderRadius: 8, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.1s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: t.text, fontWeight: 500, fontSize: 13, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.subject}</p>
                  <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{tk.employee_email}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}>
                    <Dot color={PRIORITY_COLOR[tk.priority]} />{tk.priority}
                  </span>
                  <span style={{ fontSize: 11, color: t.textMuted }}>
                    <Dot color={STATUS_COLOR[tk.status]} />{tk.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div style={{ width: 320, flexShrink: 0, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20, position: 'sticky', top: 0 }}>
            <p style={{ color: t.text, fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{selected.subject}</p>
            <p style={{ color: t.textMuted, fontSize: 11, margin: '0 0 16px' }}>{selected.employee_email}</p>
            <p style={{ color: t.textSub, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>{selected.message}</p>
            <Select label="Status" value={selected.status} onChange={v => changeStatus(selected.id, v)}
              options={[{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'resolved', label: 'Resolved' }]} />
          </div>
        )}
      </div>

      {open && (
        <Modal title="New Ticket" onClose={() => setOpen(false)} onSave={create} saveLabel="Create">
          <Field label="Employee Email" value={form.employee_email} onChange={v => setForm({ ...form, employee_email: v })} type="email" />
          <Field label="Subject" value={form.subject} onChange={v => setForm({ ...form, subject: v })} />
          <Field label="Message" value={form.message} onChange={v => setForm({ ...form, message: v })} multiline />
          <Select label="Priority" value={form.priority} onChange={v => setForm({ ...form, priority: v })}
            options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader, Modal, Field, Select } from '@/components/ui'
import { logAction } from '@/lib/audit'

interface Ticket {
  id: string; subject: string; message: string
  status: 'open' | 'in_progress' | 'resolved'; priority: 'low' | 'medium' | 'high'
  employee_email: string; assigned_to: string | null; assigned_email: string | null; created_at: string
}
interface Reply { id: string; ticket_id: string; author_id: string | null; author_email: string | null; message: string; created_at: string }
interface AdminUser { id: string; email: string; full_name: string }

const STATUS_COLOR: Record<string, string> = { open: 'amber', in_progress: 'blue', resolved: 'green' }
const PRIORITY_COLOR: Record<string, string> = { low: 'slate', medium: 'amber', high: 'red' }
const DOT_MAP: Record<string, string> = { amber: '#fbbf24', blue: '#60a5fa', green: '#4ade80', red: '#f87171', slate: '#94a3b8' }

function Dot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: DOT_MAP[color] ?? DOT_MAP.slate, marginRight: 5 }} />
}

function fmtTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function Support() {
  const { t } = useTheme()
  const { toast } = useFeedback()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium', employee_email: '' })
  const [reloadTick, setReloadTick] = useState(0)
  const repliesEndRef = useRef<HTMLDivElement>(null)

  const loadTickets = async () => {
    let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (error) toast(error.message, 'error')
    setTickets(data ?? []); setLoading(false)
  }

  useEffect(() => { loadTickets() }, [filter, reloadTick])

  useEffect(() => {
    const channel = supabase.channel('support-tickets-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        setReloadTick(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    supabase.from('users').select('id, email, full_name')
      .in('role', ['admin', 'superadmin']).eq('status', 'active')
      .then(({ data }) => setAdmins(data ?? []))
  }, [])

  useEffect(() => {
    if (!selected) { setReplies([]); return }
    supabase.from('ticket_replies').select('*').eq('ticket_id', selected.id).order('created_at', { ascending: true })
      .then(({ data }) => setReplies(data ?? []))
  }, [selected?.id])

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  const changeStatus = async (id: string, status: string) => {
    const prev = tickets
    setTickets(p => p.map(tk => tk.id === id ? { ...tk, status: status as Ticket['status'] } : tk))
    if (selected?.id === id) setSelected(s => s ? { ...s, status: status as Ticket['status'] } : s)
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id)
    if (error) { toast(error.message, 'error'); setTickets(prev); return }
    toast('Status updated')
    logAction('status_changed', 'ticket', id, selected?.subject, { status })
  }

  const assignTicket = async (id: string, adminId: string) => {
    const admin = admins.find(a => a.id === adminId)
    const prev = tickets
    setTickets(p => p.map(tk => tk.id === id ? { ...tk, assigned_to: adminId || null, assigned_email: admin?.email ?? null } : tk))
    if (selected?.id === id) setSelected(s => s ? { ...s, assigned_to: adminId || null, assigned_email: admin?.email ?? null } : s)
    const { error } = await supabase.from('support_tickets').update({ assigned_to: adminId || null, assigned_email: admin?.email ?? null }).eq('id', id)
    if (error) { toast(error.message, 'error'); setTickets(prev); return }
    toast(adminId ? `Assigned to ${admin?.email}` : 'Unassigned')
    logAction('assigned', 'ticket', id, selected?.subject, { assigned_to: admin?.email ?? null })
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return
    setSendingReply(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('ticket_replies').insert({
      ticket_id: selected.id,
      author_id: user?.id ?? null,
      author_email: user?.email ?? null,
      message: replyText.trim(),
    })
    setSendingReply(false)
    if (error) { toast(error.message, 'error'); return }
    logAction('replied', 'ticket', selected.id, selected.subject)
    setReplyText('')
    const { data } = await supabase.from('ticket_replies').select('*').eq('ticket_id', selected.id).order('created_at', { ascending: true })
    setReplies(data ?? [])
  }

  const create = async () => {
    if (!form.subject.trim()) { toast('Subject is required', 'error'); return }
    if (!form.employee_email.trim()) { toast('Employee email is required', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('support_tickets').insert({ ...form, status: 'open' })
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Ticket created')
    logAction('created', 'ticket', undefined, form.subject, { priority: form.priority })
    setOpen(false); setForm({ subject: '', message: '', priority: 'medium', employee_email: '' }); loadTickets()
  }

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Support" sub="Employee support tickets" action="New Ticket" onAction={() => setOpen(true)} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {['all', 'open', 'in_progress', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${filter === f ? '#2563eb' : t.borderStrong}`,
            background: filter === f ? '#2563eb' : 'transparent', color: filter === f ? 'white' : t.textMuted,
            fontSize: 12, cursor: 'pointer', transition: 'all 0.1s', fontWeight: filter === f ? 500 : 400,
          }}>{f === 'all' ? 'All' : f.replace('_', ' ')}</button>
        ))}
      </div>

      <div className="split">
        {/* List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No tickets.</div>
          ) : tickets.map(tk => (
            <div key={tk.id} onClick={() => setSelected(s => s?.id === tk.id ? null : tk)} style={{
              background: selected?.id === tk.id ? t.surface : t.bg,
              border: `1px solid ${selected?.id === tk.id ? '#2563eb44' : t.borderStrong}`,
              borderRadius: 8, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.1s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: t.text, fontWeight: 500, fontSize: 13, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.subject}</p>
                  <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{tk.employee_email}</p>
                  {tk.assigned_email && <p style={{ color: t.textGhost, fontSize: 10, margin: '2px 0 0' }}>→ {tk.assigned_email}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}><Dot color={PRIORITY_COLOR[tk.priority]} />{tk.priority}</span>
                  <span style={{ fontSize: 11, color: t.textMuted }}><Dot color={STATUS_COLOR[tk.status]} />{tk.status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div className="detail-panel" style={{ width: 320, flexShrink: 0, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20, position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <p style={{ color: t.text, fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>{selected.subject}</p>
            <p style={{ color: t.textMuted, fontSize: 11, margin: '0 0 12px' }}>{selected.employee_email}</p>
            <p style={{ color: t.textSub, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>{selected.message}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <Select label="Status" value={selected.status} onChange={v => changeStatus(selected.id, v)}
                options={[{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'resolved', label: 'Resolved' }]} />
              <Select label="Assign to" value={selected.assigned_to ?? ''} onChange={v => assignTicket(selected.id, v)}
                options={[{ value: '', label: 'Unassigned' }, ...admins.map(a => ({ value: a.id, label: a.full_name || a.email }))]} />
            </div>

            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <p style={{ color: t.textGhost, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Replies {replies.length > 0 && `(${replies.length})`}
              </p>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10, minHeight: 60, maxHeight: 200 }}>
                {replies.length === 0 ? (
                  <p style={{ color: t.textGhost, fontSize: 12 }}>No replies yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {replies.map(r => (
                      <div key={r.id} style={{ background: t.bg, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: t.text, fontSize: 11, fontWeight: 500 }}>{r.author_email ?? 'System'}</span>
                          <span style={{ color: t.textGhost, fontSize: 10 }}>{fmtTime(r.created_at)}</span>
                        </div>
                        <p style={{ color: t.textSub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{r.message}</p>
                      </div>
                    ))}
                    <div ref={repliesEndRef} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                  placeholder="Write a reply… (⌘↵ to send)"
                  rows={2}
                  style={{ flex: 1, padding: '8px 10px', background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.inputText, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={e => (e.target.style.borderColor = t.inputBorder)}
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sendingReply}
                  style={{ padding: '8px 12px', borderRadius: 7, border: 'none', background: replyText.trim() ? '#2563eb' : t.borderStrong, color: 'white', fontSize: 12, cursor: replyText.trim() ? 'pointer' : 'not-allowed', alignSelf: 'flex-end', opacity: sendingReply ? 0.6 : 1 }}
                >
                  {sendingReply ? '…' : '↑'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {open && (
        <Modal title="New Ticket" onClose={() => setOpen(false)} onSave={create} saving={saving} saveLabel="Create">
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

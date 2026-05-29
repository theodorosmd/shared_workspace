import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader, Modal, Field, Select, ActionBtn } from '@/components/ui'
import { logAction } from '@/lib/audit'

interface Channel { id: string; name: string; description: string; stream_url: string | null; type: string; status: string; sort_order: number; created_at: string }
interface EPGEntry { id: string; channel_id: string; program_id: string | null; title: string; description: string | null; start_time: string; end_time: string }
interface Program { id: string; title: string }

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  live: { bg: 'rgba(239,68,68,0.12)', text: '#f87171' },
  vod:  { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
}

function toLocal(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 16) : ''
}

function fmtDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
}

function groupByDay(entries: EPGEntry[]) {
  const groups: Record<string, EPGEntry[]> = {}
  entries.forEach(e => {
    const day = new Date(e.start_time).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!groups[day]) groups[day] = []
    groups[day].push(e)
  })
  return groups
}

export default function Channels() {
  const { t } = useTheme()
  const { toast, confirm } = useFeedback()
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState<Channel | null>(null)
  const [epg, setEpg] = useState<EPGEntry[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  const [chanOpen, setChanOpen] = useState(false)
  const [editingChan, setEditingChan] = useState<Channel | null>(null)
  const [chanForm, setChanForm] = useState({ name: '', description: '', stream_url: '', type: 'live', status: 'active' })
  const [savingChan, setSavingChan] = useState(false)

  const [epgOpen, setEpgOpen] = useState(false)
  const [editingEpg, setEditingEpg] = useState<EPGEntry | null>(null)
  const [epgForm, setEpgForm] = useState({ program_id: '', title: '', description: '', start_time: '', end_time: '' })
  const [savingEpg, setSavingEpg] = useState(false)

  const loadChannels = async () => {
    const { data, error } = await supabase.from('channels').select('*').order('sort_order').order('name')
    if (error) toast(error.message, 'error')
    setChannels(data ?? []); setLoading(false)
  }

  useEffect(() => { loadChannels() }, [])

  useEffect(() => {
    supabase.from('programs').select('id, title').order('title').then(({ data }) => setPrograms(data ?? []))
  }, [])

  useEffect(() => {
    if (!selected) { setEpg([]); return }
    const now = new Date()
    const twoWeeksLater = new Date(now.getTime() + 14 * 86400000)
    supabase.from('epg_schedule').select('*').eq('channel_id', selected.id)
      .gte('start_time', now.toISOString())
      .lte('start_time', twoWeeksLater.toISOString())
      .order('start_time', { ascending: true })
      .then(({ data }) => setEpg(data ?? []))
  }, [selected?.id])

  const openNewChan = () => { setEditingChan(null); setChanForm({ name: '', description: '', stream_url: '', type: 'live', status: 'active' }); setChanOpen(true) }
  const openEditChan = (c: Channel) => { setEditingChan(c); setChanForm({ name: c.name, description: c.description ?? '', stream_url: c.stream_url ?? '', type: c.type, status: c.status }); setChanOpen(true) }

  const saveChan = async () => {
    if (!chanForm.name.trim()) { toast('Channel name is required', 'error'); return }
    setSavingChan(true)
    const payload = { name: chanForm.name, description: chanForm.description, stream_url: chanForm.stream_url || null, type: chanForm.type, status: chanForm.status }
    const { error } = editingChan
      ? await supabase.from('channels').update(payload).eq('id', editingChan.id)
      : await supabase.from('channels').insert(payload)
    setSavingChan(false)
    if (error) { toast(error.message, 'error'); return }
    toast(editingChan ? 'Channel updated' : 'Channel created')
    logAction(editingChan ? 'updated' : 'created', 'channel', editingChan?.id, chanForm.name)
    setChanOpen(false); loadChannels()
  }

  const deleteChan = async (c: Channel) => {
    const ok = await confirm({ title: 'Delete channel', message: `Delete "${c.name}"? Its EPG schedule will also be removed.`, danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    const { error } = await supabase.from('channels').delete().eq('id', c.id)
    if (error) { toast(error.message, 'error'); return }
    toast('Channel deleted')
    logAction('deleted', 'channel', c.id, c.name)
    if (selected?.id === c.id) setSelected(null)
    loadChannels()
  }

  const openNewEpg = () => {
    if (!selected) return
    const now = new Date(); now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1)
    const end = new Date(now.getTime() + 3600000)
    setEditingEpg(null)
    setEpgForm({ program_id: '', title: '', description: '', start_time: toLocal(now.toISOString()), end_time: toLocal(end.toISOString()) })
    setEpgOpen(true)
  }
  const openEditEpg = (e: EPGEntry) => {
    setEditingEpg(e)
    setEpgForm({ program_id: e.program_id ?? '', title: e.title, description: e.description ?? '', start_time: toLocal(e.start_time), end_time: toLocal(e.end_time) })
    setEpgOpen(true)
  }

  const saveEpg = async () => {
    if (!epgForm.title.trim()) { toast('Title is required', 'error'); return }
    if (!epgForm.start_time || !epgForm.end_time) { toast('Start and end times are required', 'error'); return }
    if (new Date(epgForm.end_time) <= new Date(epgForm.start_time)) { toast('End time must be after start time', 'error'); return }
    setSavingEpg(true)
    const payload = {
      channel_id: selected!.id,
      program_id: epgForm.program_id || null,
      title: epgForm.title,
      description: epgForm.description || null,
      start_time: new Date(epgForm.start_time).toISOString(),
      end_time: new Date(epgForm.end_time).toISOString(),
    }
    const { error } = editingEpg
      ? await supabase.from('epg_schedule').update(payload).eq('id', editingEpg.id)
      : await supabase.from('epg_schedule').insert(payload)
    setSavingEpg(false)
    if (error) { toast(error.message, 'error'); return }
    toast(editingEpg ? 'Schedule updated' : 'Schedule entry added')
    setEpgOpen(false)
    // Reload EPG
    const now = new Date()
    const twoWeeksLater = new Date(now.getTime() + 14 * 86400000)
    const { data } = await supabase.from('epg_schedule').select('*').eq('channel_id', selected!.id)
      .gte('start_time', now.toISOString()).lte('start_time', twoWeeksLater.toISOString()).order('start_time', { ascending: true })
    setEpg(data ?? [])
  }

  const deleteEpg = async (e: EPGEntry) => {
    const ok = await confirm({ title: 'Remove slot', message: `Remove "${e.title}"?`, danger: true, confirmLabel: 'Remove' })
    if (!ok) return
    const { error } = await supabase.from('epg_schedule').delete().eq('id', e.id)
    if (error) { toast(error.message, 'error'); return }
    setEpg(prev => prev.filter(x => x.id !== e.id))
    toast('Schedule entry removed')
  }

  const groups = groupByDay(epg)

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Channels" sub="Manage broadcast channels and EPG schedule" action="New Channel" onAction={openNewChan} />

      <div className="split">
        {/* Channel list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
          ) : channels.length === 0 ? (
            <div style={{ padding: '64px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No channels yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {channels.map(c => {
                const tc = TYPE_COLOR[c.type] ?? TYPE_COLOR.live
                const isActive = c.status === 'active'
                return (
                  <div key={c.id} onClick={() => setSelected(s => s?.id === c.id ? null : c)} style={{
                    background: selected?.id === c.id ? t.surface : t.bg,
                    border: `1px solid ${selected?.id === c.id ? '#2563eb44' : t.borderStrong}`,
                    borderRadius: 8, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.1s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {c.type === 'live'
                            ? <svg width="14" height="14" fill={tc.text} viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" opacity="0.3" /><circle cx="12" cy="12" r="3" /></svg>
                            : <svg width="14" height="14" fill="none" stroke={tc.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          }
                        </div>
                        <div>
                          <p style={{ color: t.text, fontWeight: 500, fontSize: 13, margin: 0 }}>{c.name}</p>
                          {c.description && <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{c.description}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 500, background: tc.bg, color: tc.text, textTransform: 'uppercase' }}>{c.type}</span>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#4ade80' : '#94a3b8', display: 'inline-block' }} title={isActive ? 'Active' : 'Inactive'} />
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                          <ActionBtn onClick={() => openEditChan(c)} label="Edit" />
                          <ActionBtn onClick={() => deleteChan(c)} label="Delete" danger />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* EPG panel */}
        {selected && (
          <div className="detail-panel" style={{ width: 360, flexShrink: 0, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20, position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ color: t.text, fontWeight: 600, fontSize: 14, margin: 0 }}>{selected.name}</p>
                <p style={{ color: t.textMuted, fontSize: 11, margin: '2px 0 0' }}>Schedule — next 14 days</p>
              </div>
              <button onClick={openNewEpg} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#2563eb', border: 'none', borderRadius: 7, color: 'white', fontSize: 12, cursor: 'pointer' }}>
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add slot
              </button>
            </div>

            {selected.stream_url && (
              <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 7, padding: '8px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef444455' }} />
                <span style={{ fontSize: 11, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.stream_url}</span>
              </div>
            )}

            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {Object.keys(groups).length === 0 ? (
                <p style={{ color: t.textGhost, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No schedule yet. Add your first slot.</p>
              ) : (
                Object.entries(groups).map(([day, entries]) => (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <p style={{ color: t.textGhost, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>{day}</p>
                    {entries.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 7, marginBottom: 4, background: t.bg, border: `1px solid ${t.border}` }}>
                        <div style={{ flexShrink: 0, minWidth: 46, textAlign: 'right' }}>
                          <p style={{ color: t.text, fontSize: 11, fontWeight: 600, margin: 0 }}>{new Date(e.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                          <p style={{ color: t.textGhost, fontSize: 10, margin: 0 }}>{fmtDuration(e.start_time, e.end_time)}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                          {e.description && <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{e.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => openEditEpg(e)} style={{ background: 'none', border: 'none', color: t.textGhost, cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}>Edit</button>
                          <button onClick={() => deleteEpg(e)} style={{ background: 'none', border: 'none', color: t.textGhost, cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Channel modal */}
      {chanOpen && (
        <Modal title={editingChan ? 'Edit Channel' : 'New Channel'} onClose={() => setChanOpen(false)} onSave={saveChan} saving={savingChan} saveLabel={editingChan ? 'Save' : 'Create'}>
          <Field label="Channel name" value={chanForm.name} onChange={v => setChanForm({ ...chanForm, name: v })} placeholder="e.g. Suryoyo TV" />
          <Field label="Description" value={chanForm.description} onChange={v => setChanForm({ ...chanForm, description: v })} multiline />
          <Select label="Type" value={chanForm.type} onChange={v => setChanForm({ ...chanForm, type: v })}
            options={[{ value: 'live', label: 'Live — broadcast stream' }, { value: 'vod', label: 'VOD — on-demand content' }]} />
          <Field label="Stream URL" value={chanForm.stream_url} onChange={v => setChanForm({ ...chanForm, stream_url: v })} placeholder="https://..." />
          <Select label="Status" value={chanForm.status} onChange={v => setChanForm({ ...chanForm, status: v })}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </Modal>
      )}

      {/* EPG modal */}
      {epgOpen && (
        <Modal title={editingEpg ? 'Edit Schedule Entry' : 'Add Schedule Entry'} onClose={() => setEpgOpen(false)} onSave={saveEpg} saving={savingEpg} saveLabel={editingEpg ? 'Save' : 'Add'}>
          <Select label="Program (optional)" value={epgForm.program_id} onChange={v => {
            const prog = programs.find(p => p.id === v)
            setEpgForm({ ...epgForm, program_id: v, title: prog ? prog.title : epgForm.title })
          }} options={[{ value: '', label: 'Custom entry' }, ...programs.map(p => ({ value: p.id, label: p.title }))]} />
          <Field label="Title" value={epgForm.title} onChange={v => setEpgForm({ ...epgForm, title: v })} />
          <Field label="Description" value={epgForm.description} onChange={v => setEpgForm({ ...epgForm, description: v })} multiline />
          <Field label="Start time" value={epgForm.start_time} onChange={v => setEpgForm({ ...epgForm, start_time: v })} type="datetime-local" />
          <Field label="End time" value={epgForm.end_time} onChange={v => setEpgForm({ ...epgForm, end_time: v })} type="datetime-local" />
        </Modal>
      )}
    </div>
  )
}

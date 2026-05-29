import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { Modal, Field, Select } from '@/components/ui'
import { logAction } from '@/lib/audit'
import { exportCSV } from '@/lib/exportCsv'

interface Program {
  id: string; title: string; description: string; file_url: string
  country_id: string | null; category: string; published_at: string | null
  type: string; stream_url: string | null; thumbnail_url: string | null
  status: string; created_at: string
  countries?: { name: string; code: string } | null
}
interface Country { id: string; name: string; code: string }

const CATEGORIES = ['general', 'news', 'documentary', 'entertainment', 'sports', 'kids', 'religious']
const CAT_COLOR: Record<string, string> = {
  general: '#94a3b8', news: '#60a5fa', documentary: '#a78bfa',
  entertainment: '#f472b6', sports: '#4ade80', kids: '#fbbf24', religious: '#fb923c',
}

export default function Programs() {
  const { t } = useTheme()
  const { toast, confirm } = useFeedback()
  const [programs, setPrograms] = useState<Program[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'general', country_id: '', published_at: '', type: 'vod', stream_url: '', status: 'published' })
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const loadPrograms = async () => {
    const { data, error } = await supabase.from('programs').select('*, countries(name, code)').order('created_at', { ascending: false })
    if (error) toast(error.message, 'error')
    setPrograms(data ?? []); setLoading(false)
  }

  useEffect(() => {
    loadPrograms()
    supabase.from('countries').select('id, name, code').order('name').then(({ data }) => setCountries(data ?? []))
  }, [])

  const openUpload = () => {
    setEditing(null)
    setForm({ title: '', description: '', category: 'general', country_id: '', published_at: '', type: 'vod', stream_url: '', status: 'published' })
    setFile(null); setThumbnail(null); setThumbnailPreview(null); setOpen(true)
  }

  const openEdit = (p: Program) => {
    setEditing(p)
    setForm({
      title: p.title, description: p.description ?? '', category: p.category ?? 'general',
      country_id: p.country_id ?? '', published_at: p.published_at ? p.published_at.slice(0, 10) : '',
      type: p.type ?? 'vod', stream_url: p.stream_url ?? '', status: p.status ?? 'published',
    })
    setFile(null); setThumbnail(null)
    setThumbnailPreview(p.thumbnail_url ?? null)
    setOpen(true)
  }

  const save = async () => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return }
    if (!editing && !file && form.type === 'vod') { toast('Please select a file', 'error'); return }
    setSaving(true)

    const payload: Record<string, unknown> = {
      title: form.title, description: form.description,
      category: form.category || 'general',
      country_id: form.country_id || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      type: form.type,
      stream_url: form.stream_url || null,
      status: form.status,
    }

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `programs/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('programs').upload(path, file)
      if (upErr) { setSaving(false); toast(upErr.message, 'error'); return }
      payload.file_url = supabase.storage.from('programs').getPublicUrl(path).data.publicUrl
    }

    if (thumbnail) {
      const ext = thumbnail.name.split('.').pop()
      const path = `thumbnails/${Date.now()}.${ext}`
      const { error: tErr } = await supabase.storage.from('programs').upload(path, thumbnail)
      if (tErr) { setSaving(false); toast(tErr.message, 'error'); return }
      payload.thumbnail_url = supabase.storage.from('programs').getPublicUrl(path).data.publicUrl
    }

    if (editing) {
      const { error } = await supabase.from('programs').update(payload).eq('id', editing.id)
      if (error) { setSaving(false); toast(error.message, 'error'); return }
      toast('Program updated')
      logAction('updated', 'program', editing.id, form.title)
    } else {
      const { error } = await supabase.from('programs').insert(payload)
      if (error) { setSaving(false); toast(error.message, 'error'); return }
      toast('Program uploaded')
      logAction('uploaded', 'program', undefined, form.title, { category: form.category, type: form.type })
    }

    setSaving(false); setOpen(false); setFile(null); setThumbnail(null); setThumbnailPreview(null); loadPrograms()
  }

  const togglePublish = async (p: Program) => {
    const newStatus = p.status === 'published' ? 'draft' : 'published'
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'published' && !p.published_at) update.published_at = new Date().toISOString()
    setPrograms(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x))
    const { error } = await supabase.from('programs').update(update).eq('id', p.id)
    if (error) { toast(error.message, 'error'); loadPrograms(); return }
    toast(newStatus === 'published' ? 'Program published' : 'Moved to draft')
    logAction(newStatus === 'published' ? 'published' : 'unpublished', 'program', p.id, p.title)
  }

  const remove = async (p: Program) => {
    const ok = await confirm({ title: 'Delete program', message: `Delete "${p.title}"?`, danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    const path = p.file_url?.split('/programs/')[1]
    if (path) await supabase.storage.from('programs').remove([`programs/${path}`])
    const { error } = await supabase.from('programs').delete().eq('id', p.id)
    if (error) { toast(error.message, 'error'); return }
    toast('Program deleted')
    logAction('deleted', 'program', p.id, p.title)
    loadPrograms()
  }

  const doExport = async () => {
    const { data } = await supabase.from('programs').select('title, description, category, type, status, published_at, created_at')
    exportCSV(data ?? [], 'programs')
  }

  const displayed = programs.filter(p => {
    if (catFilter !== 'all' && (p.category ?? 'general') !== catFilter) return false
    if (typeFilter !== 'all' && (p.type ?? 'vod') !== typeFilter) return false
    return true
  })

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Programs</h1>
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>Manage uploaded programs</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={doExport} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textSub, fontSize: 13, cursor: 'pointer' }}>Export CSV</button>
          <button onClick={openUpload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#2563eb', border: 'none', borderRadius: 7, color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: '4px 10px', borderRadius: 6, border: `1px solid ${catFilter === c ? '#2563eb' : t.borderStrong}`,
              background: catFilter === c ? '#2563eb' : 'transparent', color: catFilter === c ? 'white' : t.textMuted,
              fontSize: 11, cursor: 'pointer', textTransform: 'capitalize',
            }}>{c}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'vod', 'live'].map(ty => (
            <button key={ty} onClick={() => setTypeFilter(ty)} style={{
              padding: '4px 10px', borderRadius: 6, border: `1px solid ${typeFilter === ty ? '#7c3aed' : t.borderStrong}`,
              background: typeFilter === ty ? '#7c3aed' : 'transparent', color: typeFilter === ty ? 'white' : t.textMuted,
              fontSize: 11, cursor: 'pointer', textTransform: 'uppercase',
            }}>{ty === 'all' ? 'All types' : ty}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No programs found.</div>
      ) : (
        <div className="cards-grid">
          {displayed.map(p => {
            const catColor = CAT_COLOR[p.category ?? 'general'] ?? '#94a3b8'
            const isDraft = p.status === 'draft'
            const isLive = p.type === 'live'
            return (
              <div key={p.id} style={{ background: t.surface, border: `1px solid ${isDraft ? t.border : t.borderStrong}`, borderRadius: 10, overflow: 'hidden', opacity: isDraft ? 0.75 : 1 }}>
                {/* Thumbnail or header */}
                {p.thumbnail_url ? (
                  <div style={{ height: 120, overflow: 'hidden', background: t.bg }}>
                    <img src={p.thumbnail_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: 64, background: catColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" fill="none" stroke={catColor} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                )}

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ color: t.text, fontWeight: 500, fontSize: 13, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{p.title}</p>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" style={{ color: t.textMuted, fontSize: 11 }}>↗</a>}
                      <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 11 }}>Edit</button>
                      <button onClick={() => remove(p)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  </div>

                  {p.description && <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}

                  {isLive && p.stream_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
                      <span style={{ fontSize: 10, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.stream_url}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    <span style={{ padding: '2px 7px', borderRadius: 999, background: catColor + '1a', color: catColor, fontSize: 10, fontWeight: 500, textTransform: 'capitalize' }}>{p.category ?? 'general'}</span>
                    <span style={{ padding: '2px 7px', borderRadius: 999, background: isLive ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: isLive ? '#f87171' : '#60a5fa', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' }}>{p.type ?? 'vod'}</span>
                    {p.countries && <span style={{ padding: '2px 7px', borderRadius: 999, background: t.bg, color: t.textGhost, fontSize: 10, border: `1px solid ${t.border}` }}>{p.countries.code}</span>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => togglePublish(p)} style={{
                      padding: '3px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 500,
                      background: isDraft ? 'rgba(100,116,139,0.15)' : 'rgba(34,197,94,0.12)',
                      color: isDraft ? '#94a3b8' : '#4ade80',
                    }}>
                      {isDraft ? '○ Draft' : '● Published'}
                    </button>
                    <p style={{ color: t.textGhost, fontSize: 10, margin: 0 }}>{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <Modal title={editing ? 'Edit Program' : 'Upload Program'} onClose={() => { setOpen(false); setFile(null); setThumbnail(null); setThumbnailPreview(null) }} onSave={save} saving={saving} saveLabel={editing ? 'Save' : 'Upload'}>
          <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} multiline />
          <Select label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })}
            options={[{ value: 'vod', label: 'VOD — on-demand video' }, { value: 'live', label: 'Live — broadcast stream' }]} />
          {form.type === 'live' && <Field label="Stream URL" value={form.stream_url} onChange={v => setForm({ ...form, stream_url: v })} placeholder="https://..." />}
          <Select label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })}
            options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <Select label="Country" value={form.country_id} onChange={v => setForm({ ...form, country_id: v })}
            options={[{ value: '', label: 'No country' }, ...countries.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))]} />
          <Field label="Publish date" value={form.published_at} onChange={v => setForm({ ...form, published_at: v })} type="date" />
          <Select label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })}
            options={[{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} />

          {/* Thumbnail */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>Thumbnail (optional)</p>
            {thumbnailPreview && <img src={thumbnailPreview} alt="thumb" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />}
            <div onClick={() => thumbRef.current?.click()} style={{ border: `2px dashed ${thumbnail ? '#3b82f6' : t.borderStrong}`, borderRadius: 8, padding: '14px 16px', textAlign: 'center', cursor: 'pointer' }}>
              <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>{thumbnail ? thumbnail.name : 'Click to select cover image'}</p>
            </div>
            <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files?.[0] ?? null
              setThumbnail(f)
              setThumbnailPreview(f ? URL.createObjectURL(f) : (editing?.thumbnail_url ?? null))
            }} />
          </div>

          {/* File */}
          {form.type === 'vod' && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>{editing ? 'Replace file (optional)' : 'File'}</p>
              <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${file ? '#3b82f6' : t.borderStrong}`, borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}>
                <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>{file ? file.name : (editing ? 'Click to replace file' : 'Click to select a file')}</p>
              </div>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

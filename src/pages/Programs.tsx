import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader, Modal, Field, Select } from '@/components/ui'
import { logAction } from '@/lib/audit'

interface Program {
  id: string; title: string; description: string; file_url: string
  country_id: string | null; category: string; published_at: string | null; created_at: string
  countries?: { name: string; code: string } | null
}
interface Country { id: string; name: string; code: string }

const CATEGORIES = ['general', 'news', 'documentary', 'entertainment', 'sports', 'kids', 'religious']
const CAT_COLOR: Record<string, string> = {
  general: '#94a3b8', news: '#60a5fa', documentary: '#a78bfa', entertainment: '#f472b6',
  sports: '#4ade80', kids: '#fbbf24', religious: '#fb923c',
}

export default function Programs() {
  const { t } = useTheme()
  const { toast, confirm } = useFeedback()
  const [programs, setPrograms] = useState<Program[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'general', country_id: '', published_at: '' })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadPrograms = async () => {
    const { data, error } = await supabase.from('programs').select('*, countries(name, code)').order('created_at', { ascending: false })
    if (error) toast(error.message, 'error')
    setPrograms(data ?? []); setLoading(false)
  }

  useEffect(() => {
    loadPrograms()
    supabase.from('countries').select('id, name, code').order('name').then(({ data }) => setCountries(data ?? []))
  }, [])

  const openUpload = () => { setEditing(null); setForm({ title: '', description: '', category: 'general', country_id: '', published_at: '' }); setFile(null); setOpen(true) }
  const openEdit = (p: Program) => {
    setEditing(p)
    setForm({ title: p.title, description: p.description ?? '', category: p.category ?? 'general', country_id: p.country_id ?? '', published_at: p.published_at ? p.published_at.slice(0, 10) : '' })
    setFile(null); setOpen(true)
  }

  const save = async () => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return }
    if (!editing && !file) { toast('Please select a file', 'error'); return }
    setSaving(true)

    const payload: Record<string, unknown> = {
      title: form.title, description: form.description,
      category: form.category || 'general',
      country_id: form.country_id || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
    }

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `programs/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('programs').upload(path, file)
      if (upErr) { setSaving(false); toast(upErr.message, 'error'); return }
      payload.file_url = supabase.storage.from('programs').getPublicUrl(path).data.publicUrl
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
      logAction('uploaded', 'program', undefined, form.title, { category: form.category })
    }

    setSaving(false); setOpen(false); setFile(null); loadPrograms()
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

  const displayed = catFilter === 'all' ? programs : programs.filter(p => (p.category ?? 'general') === catFilter)

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Programs" sub="Manage uploaded programs" action="Upload" onAction={openUpload} />

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${catFilter === c ? '#2563eb' : t.borderStrong}`,
            background: catFilter === c ? '#2563eb' : 'transparent',
            color: catFilter === c ? 'white' : t.textMuted,
            fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.1s',
          }}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No programs yet.</div>
      ) : (
        <div className="cards-grid">
          {displayed.map(p => {
            const catColor = CAT_COLOR[p.category ?? 'general'] ?? '#94a3b8'
            return (
              <div key={p.id} style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: catColor + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" fill="none" stroke={catColor} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" style={{ color: t.textMuted, fontSize: 11, textDecoration: 'none' }}>↗</a>}
                    <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 11 }}>Edit</button>
                    <button onClick={() => remove(p)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>

                <p style={{ color: t.text, fontWeight: 500, fontSize: 14, margin: '0 0 4px' }}>{p.title}</p>
                {p.description && <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>{p.description}</p>}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: catColor + '1a', color: catColor, fontSize: 10, fontWeight: 500, textTransform: 'capitalize' }}>{p.category ?? 'general'}</span>
                  {p.countries && <span style={{ padding: '2px 8px', borderRadius: 999, background: t.bg, color: t.textGhost, fontSize: 10, border: `1px solid ${t.border}` }}>{p.countries.code}</span>}
                  {p.published_at && <span style={{ padding: '2px 8px', borderRadius: 999, background: t.bg, color: t.textGhost, fontSize: 10, border: `1px solid ${t.border}` }}>{new Date(p.published_at).toLocaleDateString()}</span>}
                </div>

                <p style={{ color: t.textGhost, fontSize: 11, marginTop: 10 }}>Added {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <Modal
          title={editing ? 'Edit Program' : 'Upload Program'}
          onClose={() => { setOpen(false); setFile(null) }}
          onSave={save} saving={saving}
          saveLabel={editing ? 'Save' : 'Upload'}
        >
          <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} multiline />
          <Select label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })}
            options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <Select label="Country" value={form.country_id} onChange={v => setForm({ ...form, country_id: v })}
            options={[{ value: '', label: 'No country' }, ...countries.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))]} />
          <Field label="Publish date" value={form.published_at} onChange={v => setForm({ ...form, published_at: v })} type="date" />
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>{editing ? 'Replace file (optional)' : 'File'}</p>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${file ? '#3b82f6' : t.borderStrong}`, borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}>
              {file
                ? <p style={{ color: t.text, fontSize: 13, margin: 0 }}>{file.name}</p>
                : <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>{editing ? 'Click to replace file' : 'Click to select a file'}</p>}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </Modal>
      )}
    </div>
  )
}

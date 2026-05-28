import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { PageHeader, Modal, Field } from '@/components/ui'

interface Program { id: string; title: string; description: string; file_url: string; created_at: string }

export default function Programs() {
  const { t } = useTheme()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetch = async () => {
    const { data } = await supabase.from('programs').select('*').order('created_at', { ascending: false })
    setPrograms(data ?? []); setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const upload = async () => {
    if (!form.title || !file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `programs/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('programs').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('programs').getPublicUrl(path)
      await supabase.from('programs').insert({ ...form, file_url: publicUrl })
    }
    setUploading(false); setOpen(false); setForm({ title: '', description: '' }); setFile(null); fetch()
  }

  const remove = async (id: string, fileUrl: string) => {
    if (!confirm('Delete?')) return
    const path = fileUrl.split('/programs/')[1]
    await supabase.storage.from('programs').remove([`programs/${path}`])
    await supabase.from('programs').delete().eq('id', id); fetch()
  }

  return (
    <div style={{ minHeight: '100%', background: t.bg, padding: 48, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Programs" sub="Manage uploaded programs" action="Upload" onAction={() => setOpen(true)} />

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
      ) : programs.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No programs yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {programs.map(p => (
            <div key={p.id} style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" style={{ color: t.textMuted, fontSize: 11 }}>↗</a>}
                  <button onClick={() => remove(p.id, p.file_url)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              </div>
              <p style={{ color: t.text, fontWeight: 500, fontSize: 14, margin: '0 0 4px' }}>{p.title}</p>
              <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 12px' }}>{p.description}</p>
              <p style={{ color: t.textGhost, fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Upload Program" onClose={() => { setOpen(false); setFile(null) }} onSave={upload} saveLabel={uploading ? 'Uploading…' : 'Upload'}>
          <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} multiline />
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>File</p>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${t.borderStrong}`, borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}>
              {file
                ? <p style={{ color: t.text, fontSize: 13, margin: 0 }}>{file.name}</p>
                : <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>Click to select a file</p>}
            </div>
            <input ref={fileRef} type="file" className="hidden" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </Modal>
      )}
    </div>
  )
}

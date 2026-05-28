import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { PageHeader, Table, Modal, Field, ActionBtn } from '@/components/ui'

interface Country { id: string; name: string; code: string; region: string; created_at: string }

export default function Countries() {
  const { t } = useTheme()
  const [rows, setRows] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Country | null>(null)
  const [form, setForm] = useState({ name: '', code: '', region: '' })

  const fetch = async () => {
    const { data } = await supabase.from('countries').select('*').order('name')
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openNew = () => { setEditing(null); setForm({ name: '', code: '', region: '' }); setOpen(true) }
  const openEdit = (c: Country) => { setEditing(c); setForm({ name: c.name, code: c.code, region: c.region }); setOpen(true) }

  const save = async () => {
    if (editing) await supabase.from('countries').update(form).eq('id', editing.id)
    else await supabase.from('countries').insert(form)
    setOpen(false); fetch()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this country?')) return
    await supabase.from('countries').delete().eq('id', id); fetch()
  }

  return (
    <div style={{ minHeight: '100%', background: t.bg, padding: 48, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Countries" sub="Manage available countries" action="Add Country" onAction={openNew} />
      <Table
        loading={loading}
        empty="No countries yet."
        cols={['Name', 'Code', 'Region', '']}
        rows={rows.map(c => [
          <span style={{ fontWeight: 500, color: t.text }}>{c.name}</span>,
          <span style={{ color: t.textMuted, textTransform: 'uppercase' as const }}>{c.code}</span>,
          <span style={{ color: t.textSub }}>{c.region}</span>,
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <ActionBtn onClick={() => openEdit(c)} label="Edit" />
            <ActionBtn onClick={() => remove(c.id)} label="Delete" danger />
          </div>,
        ])}
      />
      {open && (
        <Modal title={editing ? 'Edit Country' : 'Add Country'} onClose={() => setOpen(false)} onSave={save} saveLabel={editing ? 'Save' : 'Add'}>
          <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Code" value={form.code} onChange={v => setForm({ ...form, code: v })} placeholder="eg. FR" />
          <Field label="Region" value={form.region} onChange={v => setForm({ ...form, region: v })} />
        </Modal>
      )}
    </div>
  )
}

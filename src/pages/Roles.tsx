import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { PageHeader, Modal, Field, ActionBtn } from '@/components/ui'

interface Role { id: string; name: string; description: string; permissions: string[] }

const ALL = ['view_dashboard','manage_users','manage_countries','upload_programs','view_programs','manage_tickets','view_tickets','manage_roles']

export default function Roles() {
  const { t } = useTheme()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] })

  const fetch = async () => {
    const { data } = await supabase.from('roles').select('*').order('name')
    setRoles(data ?? []); setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', permissions: [] }); setOpen(true) }
  const openEdit = (r: Role) => { setEditing(r); setForm({ name: r.name, description: r.description, permissions: r.permissions ?? [] }); setOpen(true) }
  const toggle = (p: string) => setForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p] }))
  const save = async () => {
    if (editing) await supabase.from('roles').update(form).eq('id', editing.id)
    else await supabase.from('roles').insert(form)
    setOpen(false); fetch()
  }
  const remove = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('roles').delete().eq('id', id); fetch() }

  return (
    <div style={{ minHeight: '100%', background: t.bg, padding: 48, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Settings — Roles" sub="Define roles and permissions" action="New Role" onAction={openNew} />

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {roles.map(r => (
            <div key={r.id} style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ color: t.text, fontWeight: 600, fontSize: 14, margin: 0, textTransform: 'capitalize' }}>{r.name}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <ActionBtn onClick={() => openEdit(r)} label="Edit" />
                  <ActionBtn onClick={() => remove(r.id)} label="Delete" danger />
                </div>
              </div>
              <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 12px' }}>{r.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(r.permissions ?? []).map(p => (
                  <span key={p} style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: 11 }}>
                    {p.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editing ? 'Edit Role' : 'New Role'} onClose={() => setOpen(false)} onSave={save} saveLabel={editing ? 'Save' : 'Create'}>
          <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} multiline />
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 10 }}>Permissions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ALL.map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: t.textSub, fontSize: 12 }}>
                  <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => toggle(p)}
                    style={{ accentColor: '#2563eb', width: 13, height: 13 }} />
                  {p.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader, Badge } from '@/components/ui'

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  viewer: 'Viewer',
  administrator: 'Administrator',
  responsible_publisher: 'Responsible Publisher',
  production_manager: 'Production Manager',
  producer: 'Producer',
  production_technician: 'Production Technician',
  production_employee: 'Production Staff',
  presenter: 'Presenter / Host',
  news_writer: 'News Writer',
  web_designer: 'Web Designer',
}

const BYPASS_ROLES = ['superadmin', 'admin']
const STATIC_ROLES = Object.keys(ROLE_LABELS).filter(r => !BYPASS_ROLES.includes(r))

const MODULES = [
  { key: 'dashboard',  label: 'Dashboard' },
  { key: 'countries',  label: 'Countries' },
  { key: 'users',      label: 'User Management' },
  { key: 'programs',   label: 'Programs' },
  { key: 'channels',   label: 'Channels' },
  { key: 'support',    label: 'Support' },
  { key: 'audit',      label: 'Audit Log' },
  { key: 'roles',      label: 'Roles & Permissions' },
]

const ACTIONS = ['view', 'create', 'edit', 'delete'] as const
type Action = typeof ACTIONS[number]

const FLAT_PERMS = MODULES.flatMap(mod => [
  { key: `${mod.key}:view`,   label: `View ${mod.label}` },
  { key: `${mod.key}:create`, label: `Create in ${mod.label}` },
  { key: `${mod.key}:edit`,   label: `Edit ${mod.label}` },
  { key: `${mod.key}:delete`, label: `Delete in ${mod.label}` },
])

const toSlug = (n: string) => n.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40)

interface CustomRole { id: string; label: string; description: string | null }

export default function Roles() {
  const { t } = useTheme()
  const { toast, confirm } = useFeedback()

  const [sel, setSel]             = useState(STATIC_ROLES[0])
  const [map, setMap]             = useState<Record<string, Set<Action>>>({})
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [showNew, setShowNew]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [newPerms, setNewPerms]   = useState<Set<string>>(new Set())
  const [creating, setCreating]   = useState(false)

  const allRoleLabels = useCallback((id: string) =>
    ROLE_LABELS[id] ?? customRoles.find(r => r.id === id)?.label ?? id
  , [customRoles])

  const loadCustomRoles = useCallback(async () => {
    const { data } = await supabase.from('custom_roles').select('id, label, description').order('created_at')
    setCustomRoles(data ?? [])
  }, [])

  useEffect(() => { loadCustomRoles() }, [loadCustomRoles])

  const loadPerms = useCallback(async (role: string) => {
    setLoading(true)
    const { data } = await supabase.from('role_permissions').select('module, action').eq('role', role)
    const m: Record<string, Set<Action>> = {}
    for (const row of (data ?? [])) {
      if (!m[row.module]) m[row.module] = new Set()
      m[row.module].add(row.action as Action)
    }
    setMap(m); setLoading(false)
  }, [])

  useEffect(() => { loadPerms(sel) }, [sel, loadPerms])

  const toggle = (mod: string, action: Action) =>
    setMap(prev => { const s = new Set(prev[mod] ?? []); s.has(action) ? s.delete(action) : s.add(action); return { ...prev, [mod]: s } })

  const toggleRow = (mod: string) => {
    const all = ACTIONS.every(a => map[mod]?.has(a))
    setMap(prev => ({ ...prev, [mod]: all ? new Set<Action>() : new Set(ACTIONS) }))
  }

  const selectAll = () => { const m: Record<string, Set<Action>> = {}; MODULES.forEach(x => { m[x.key] = new Set(ACTIONS) }); setMap(m) }
  const clearAll  = () => setMap({})

  const save = async () => {
    setSaving(true)
    await supabase.from('role_permissions').delete().eq('role', sel)
    const rows: { role: string; module: string; action: string }[] = []
    for (const mod of MODULES)
      for (const a of ACTIONS)
        if (map[mod.key]?.has(a)) rows.push({ role: sel, module: mod.key, action: a })
    if (rows.length > 0) {
      const { error } = await supabase.from('role_permissions').insert(rows)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    }
    toast('Permissions saved'); setSaving(false)
  }

  const allRow  = (mod: string) => ACTIONS.every(a => map[mod]?.has(a))
  const someRow = (mod: string) => ACTIONS.some(a => map[mod]?.has(a))

  const createRole = async () => {
    if (!newName.trim()) return toast('Name is required', 'error')
    const id = toSlug(newName)
    if (!id) return toast('Invalid name', 'error')
    setCreating(true)
    const { error: roleErr } = await supabase.from('custom_roles').insert({ id, label: newName.trim(), description: newDesc.trim() || null })
    if (roleErr) { toast(roleErr.code === '23505' ? 'A role with that name already exists' : roleErr.message, 'error'); setCreating(false); return }
    if (newPerms.size > 0) {
      const rows = Array.from(newPerms).map(key => {
        const [module, action] = key.split(':')
        return { role: id, module, action }
      })
      await supabase.from('role_permissions').insert(rows)
    }
    toast(`Role "${newName.trim()}" created`)
    setCreating(false); setShowNew(false); setNewName(''); setNewDesc(''); setNewPerms(new Set())
    await loadCustomRoles()
    setSel(id)
  }

  const deleteRole = async (id: string, label: string) => {
    const ok = await confirm({ title: `Delete "${label}"?`, message: 'All permissions for this role will be removed.', danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    await supabase.from('role_permissions').delete().eq('role', id)
    await supabase.from('custom_roles').delete().eq('id', id)
    toast('Role deleted')
    await loadCustomRoles()
    if (sel === id) setSel(STATIC_ROLES[0])
  }

  const inp = (): React.CSSProperties => ({
    width: '100%', padding: '8px 10px', background: t.input, border: `1px solid ${t.inputBorder}`,
    borderRadius: 7, color: t.inputText, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <PageHeader title="Roles & Permissions" sub="Define what each role can access across the super admin portal" />
        <button onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#7c3aed', border: 'none', borderRadius: 7, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          New Role
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Role list */}
        <div style={{ width: 215, flexShrink: 0 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '7px 14px 3px' }}>
              <span style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Full Access</span>
            </div>
            {BYPASS_ROLES.map((r, i) => (
              <div key={r} style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${t.border}` }}>
                <span style={{ color: t.textSub, fontSize: 14 }}>{ROLE_LABELS[r]}</span>
                <Badge label="Full access" color={i === 0 ? 'violet' : 'blue'} />
              </div>
            ))}
            <div style={{ padding: '7px 14px 3px', marginTop: 4 }}>
              <span style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Built-in</span>
            </div>
            {STATIC_ROLES.map(r => (
              <button key={r} onClick={() => setSel(r)}
                style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: sel === r ? '#7c3aed14' : 'transparent', border: 'none', borderTop: `1px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `3px solid ${sel === r ? '#7c3aed' : 'transparent'}` }}>
                <span style={{ color: sel === r ? '#7c3aed' : t.text, fontSize: 14, fontWeight: sel === r ? 600 : 400 }}>{ROLE_LABELS[r]}</span>
                {sel === r && <svg width="12" height="12" fill="none" stroke="#7c3aed" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>}
              </button>
            ))}
            {customRoles.length > 0 && (
              <div style={{ padding: '7px 14px 3px', marginTop: 4 }}>
                <span style={{ color: t.textGhost, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Custom</span>
              </div>
            )}
            {customRoles.map(r => (
              <button key={r.id} onClick={() => setSel(r.id)}
                style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: sel === r.id ? '#7c3aed14' : 'transparent', border: 'none', borderTop: `1px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `3px solid ${sel === r.id ? '#7c3aed' : 'transparent'}`, gap: 6 }}>
                <span style={{ color: sel === r.id ? '#7c3aed' : t.text, fontSize: 14, fontWeight: sel === r.id ? 600 : 400, flex: 1, textAlign: 'left' }}>{r.label}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Badge label="Custom" color="cyan" />
                  <button onClick={e => { e.stopPropagation(); deleteRole(r.id, r.label) }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textGhost, fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = t.textGhost)}>×</button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permission matrix */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ color: t.text, fontSize: 17, fontWeight: 600, margin: 0 }}>{allRoleLabels(sel)}</h2>
              <p style={{ color: t.textMuted, fontSize: 14, margin: '2px 0 0' }}>Select which modules and actions this role can perform</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAll} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>Select all</button>
              <button onClick={clearAll}  style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>Clear all</button>
              <button onClick={save} disabled={saving}
                style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {loading ? <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Loading…</div> : (
            <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: t.textMuted, fontWeight: 500, fontSize: 13 }}>Module</th>
                    {ACTIONS.map(a => <th key={a} style={{ textAlign: 'center', padding: '10px 12px', color: t.textMuted, fontWeight: 500, fontSize: 13, textTransform: 'capitalize', width: 80 }}>{a}</th>)}
                    <th style={{ textAlign: 'center', padding: '10px 12px', color: t.textMuted, fontWeight: 500, fontSize: 13, width: 60 }}>All</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => (
                    <tr key={mod.key} style={{ borderBottom: i < MODULES.length - 1 ? `1px solid ${t.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.surfaceHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 16px' }}><span style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{mod.label}</span></td>
                      {ACTIONS.map(action => (
                        <td key={action} style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <input type="checkbox" checked={!!map[mod.key]?.has(action)} onChange={() => toggle(mod.key, action)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }} />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                        <input type="checkbox" checked={allRow(mod.key)}
                          ref={el => { if (el) el.indeterminate = someRow(mod.key) && !allRow(mod.key) }}
                          onChange={() => toggleRow(mod.key)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Role modal */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.15s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 12, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ color: t.text, fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>New Role</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: t.textSub, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Regional Manager" style={inp()} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', color: t.textSub, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this role do?" rows={3}
                style={{ ...inp(), resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <span style={{ color: t.textSub, fontSize: 13, fontWeight: 600 }}>Permissions</span>
              <span style={{ color: t.textGhost, fontSize: 13, marginLeft: 8 }}>({newPerms.size} selected)</span>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                {FLAT_PERMS.map(p => (
                  <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 6px', borderRadius: 5 }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <input type="checkbox" checked={newPerms.has(p.key)}
                      onChange={() => setNewPerms(prev => { const s = new Set(prev); s.has(p.key) ? s.delete(p.key) : s.add(p.key); return s })}
                      style={{ width: 15, height: 15, accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ color: t.text, fontSize: 13 }}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} disabled={creating}
                style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textSub, fontSize: 15, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={createRole} disabled={creating}
                style={{ padding: '8px 22px', borderRadius: 7, border: 'none', background: '#7c3aed', color: 'white', fontSize: 15, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

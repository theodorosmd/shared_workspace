import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader, Modal, Field, Select } from '@/components/ui'
import { logAction } from '@/lib/audit'
import { adminAvailable, inviteUser, banUser, unbanUser } from '@/lib/supabaseAdmin'
import { exportCSV } from '@/lib/exportCsv'

interface Profile {
  id: string; email: string; full_name: string; role: string
  status: string; suspended_at: string | null; created_at: string
  last_login?: string | null; phone?: string | null
  country?: string | null; city?: string | null
}
interface AuditEntry { id: string; action: string; entity_name: string | null; actor_email: string | null; created_at: string }
interface CountryOpt { id: string; name: string; region: string }

const ROLE_LEVELS: Record<string, number> = {
  superadmin: 4, admin: 3, manager: 2,
  employee: 1, viewer: 0,
  administrator: 2, responsible_publisher: 2, production_manager: 2,
  producer: 1, production_technician: 1, production_employee: 1,
  presenter: 1, news_writer: 1, web_designer: 1,
}
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin', admin: 'Admin', manager: 'Manager',
  employee: 'Employee', viewer: 'Viewer',
  administrator: 'Administrator', responsible_publisher: 'Responsible Publisher',
  production_manager: 'Production Manager', producer: 'Producer',
  production_technician: 'Production Technician', production_employee: 'Production Employee',
  presenter: 'Program Leader', news_writer: 'News Writer', web_designer: 'Web Designer',
}
const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  superadmin:           { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  admin:                { bg: 'rgba(59,130,246,0.12)',   text: '#60a5fa' },
  manager:              { bg: 'rgba(139,92,246,0.12)',   text: '#a78bfa' },
  employee:             { bg: 'rgba(34,197,94,0.12)',    text: '#4ade80' },
  viewer:               { bg: 'rgba(100,116,139,0.12)',  text: '#94a3b8' },
  administrator:        { bg: 'rgba(59,130,246,0.12)',   text: '#60a5fa' },
  responsible_publisher:{ bg: 'rgba(245,158,11,0.12)',   text: '#fbbf24' },
  production_manager:   { bg: 'rgba(99,102,241,0.12)',   text: '#818cf8' },
  producer:             { bg: 'rgba(45,212,191,0.12)',   text: '#2dd4bf' },
  production_technician:{ bg: 'rgba(34,211,238,0.12)',   text: '#22d3ee' },
  production_employee:  { bg: 'rgba(34,197,94,0.12)',    text: '#4ade80' },
  presenter:            { bg: 'rgba(244,114,182,0.12)',  text: '#f472b6' },
  news_writer:          { bg: 'rgba(251,146,60,0.12)',   text: '#fb923c' },
  web_designer:         { bg: 'rgba(163,230,53,0.12)',   text: '#a3e635' },
}

function fmtTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange() }}
      style={{ width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: on ? '#22c55e' : 'rgba(100,116,139,0.3)', transition: 'background 0.2s',
        position: 'relative', flexShrink: 0, padding: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  )
}

function RoleMenu({ role, roles, onSelect, rc }: {
  role: string; roles: string[]; onSelect: (r: string) => void;
  rc: { bg: string; text: string }
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        style={{ padding: '3px 10px', borderRadius: 999, background: rc.bg, border: `1px solid ${rc.text}44`,
          color: rc.text, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
        {ROLE_LABELS[role] ?? role}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1e2433',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 180, overflow: 'hidden' }}>
          {roles.map(r => {
            const c = ROLE_COLOR[r] ?? ROLE_COLOR.viewer
            return (
              <button key={r} onClick={() => { onSelect(r); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  background: r === role ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none',
                  cursor: 'pointer', fontSize: 12, color: c.text, textAlign: 'left',
                  transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = r === role ? 'rgba(255,255,255,0.06)' : 'transparent')}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
                {ROLE_LABELS[r] ?? r}
                {r === role && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Users() {
  const { t } = useTheme()
  const { toast, confirm } = useFeedback()
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [myRole, setMyRole] = useState('viewer')
  const [myId, setMyId] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<AuditEntry[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ full_name: '', phone: '', email: '', role: 'viewer', country: '', city: '' })
  const [inviting, setInviting] = useState(false)
  const [countries, setCountries] = useState<CountryOpt[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setMyId(data.user.id)
      supabase.from('users').select('role').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p) setMyRole(p.role) })
    })
    loadUsers()
    supabase.from('countries').select('id, name, region').order('name')
      .then(({ data }) => setCountries(data ?? []))
  }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) toast(error.message, 'error')
    setUsers(data ?? []); setFiltered(data ?? []); setLoading(false)
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
    ))
  }, [search, users])

  const loadActivity = useCallback(async (userId: string) => {
    const { data } = await supabase.from('audit_logs').select('id, action, entity_name, actor_email, created_at')
      .or(`actor_id.eq.${userId},entity_id.eq.${userId}`)
      .order('created_at', { ascending: false }).limit(6)
    setSelectedActivity(data ?? [])
  }, [])

  useEffect(() => {
    if (selected) loadActivity(selected.id)
    else setSelectedActivity([])
  }, [selected?.id])

  const allRoles = ['superadmin', 'admin', 'manager', 'employee', 'viewer',
    'administrator', 'responsible_publisher', 'production_manager',
    'producer', 'production_technician', 'production_employee',
    'presenter', 'news_writer', 'web_designer']
  const availableRoles = myRole === 'superadmin' ? allRoles : allRoles.filter(r => r !== 'superadmin')

  const canEdit = (targetRole: string) =>
    (ROLE_LEVELS[myRole] ?? 0) > (ROLE_LEVELS[targetRole] ?? 0)

  const changeRole = async (id: string, role: string, email: string) => {
    const prev = users
    setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
    if (selected?.id === id) setSelected(s => s ? { ...s, role } : s)
    const { error } = await supabase.from('users').update({ role }).eq('id', id)
    if (error) { toast(error.message, 'error'); setUsers(prev); return }
    toast('Role updated')
    logAction('role_changed', 'user', id, email, { new_role: role })
  }

  const toggleActive = async (user: Profile) => {
    const isSuspended = user.status === 'suspended'
    if (!isSuspended) {
      const ok = await confirm({
        title: `Deactivate ${user.email}?`,
        message: 'They will be immediately logged out and unable to sign in.',
        danger: true, confirmLabel: 'Deactivate',
      })
      if (!ok) return
    }
    try {
      if (isSuspended) await unbanUser(user.id)
      else await banUser(user.id)
      const newStatus = isSuspended ? 'active' : 'suspended'
      await supabase.from('users').update({ status: newStatus, suspended_at: isSuspended ? null : new Date().toISOString() }).eq('id', user.id)
      setUsers(p => p.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
      setSelected(s => s?.id === user.id ? { ...s, status: newStatus } : s)
      toast(isSuspended ? 'User activated' : 'User deactivated')
      logAction(isSuspended ? 'unsuspended' : 'suspended', 'user', user.id, user.email)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Action failed', 'error')
    }
  }

  const submitInvite = async () => {
    if (!inviteForm.email.trim()) { toast('Email is required', 'error'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) { toast('Enter a valid email address', 'error'); return }
    if (!adminAvailable) { toast('Admin Edge Function not deployed — run: supabase functions deploy admin-ops', 'error'); return }
    setInviting(true)
    try {
      await inviteUser(inviteForm.email.trim(), inviteForm.role)
      // Upsert extra profile fields after invite
      setTimeout(async () => {
        await supabase.from('users').upsert({
          email: inviteForm.email.trim(),
          full_name: inviteForm.full_name.trim() || null,
          phone: inviteForm.phone.trim() || null,
          country: inviteForm.country || null,
          city: inviteForm.city.trim() || null,
          role: inviteForm.role,
        }, { onConflict: 'email' })
      }, 1500)
      toast(`Invite sent to ${inviteForm.email}`)
      logAction('invited', 'user', undefined, inviteForm.email, { role: inviteForm.role })
      setInviteOpen(false)
      setInviteForm({ full_name: '', phone: '', email: '', role: 'viewer', country: '', city: '' })
      setTimeout(loadUsers, 2000)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Invite failed', 'error')
    }
    setInviting(false)
  }

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Users" sub="Manage platform users" action="Invite User" onAction={() => setInviteOpen(true)} />

      {/* Search + Export */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 300, flex: 1 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.inputText, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#3b82f6')}
            onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
        </div>
        <button
          onClick={() => exportCSV(filtered.map(u => ({ name: u.full_name, email: u.email, role: u.role, status: u.status ?? 'active', joined: new Date(u.created_at).toLocaleDateString() })), 'users')}
          style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textMuted, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Export CSV
        </button>
      </div>

      <div className="split">
        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
          ) : (
            <div className="table-wrap" style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 540 }}>
                <thead>
                  <tr>
                    {['User', 'Role', 'Active', 'Last Login', 'Joined'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 18px', color: t.textMuted, fontWeight: 500, borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const rc = ROLE_COLOR[u.role] ?? ROLE_COLOR.viewer
                    const editable = canEdit(u.role) && u.id !== myId
                    const isActive = u.status !== 'suspended'
                    return (
                      <tr key={u.id} onClick={() => setSelected(s => s?.id === u.id ? null : u)}
                        style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer', background: selected?.id === u.id ? t.surface : 'transparent', transition: 'background 0.1s' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isActive ? '#2563eb22' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#60a5fa' : '#f87171', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                              {(u.full_name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p style={{ color: t.text, fontWeight: 500, margin: 0, opacity: isActive ? 1 : 0.5 }}>{u.full_name || '—'}</p>
                              <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {editable
                            ? <RoleMenu role={u.role || 'viewer'} roles={availableRoles} rc={rc} onSelect={r => changeRole(u.id, r, u.email)} />
                            : <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: rc.bg, color: rc.text, fontSize: 11, fontWeight: 500 }}>{ROLE_LABELS[u.role] ?? u.role}</span>
                          }
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {editable
                            ? <Toggle on={isActive} onChange={() => toggleActive(u)} />
                            : <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: isActive ? '#4ade80' : '#f87171' }}>{isActive ? 'active' : 'inactive'}</span>
                          }
                        </td>
                        <td style={{ padding: '12px 18px', color: t.textMuted, fontSize: 12 }}>
                          {u.last_login ? fmtTime(u.last_login) : '—'}
                        </td>
                        <td style={{ padding: '12px 18px', color: t.textMuted }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel" style={{ width: 280, flexShrink: 0, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: 20, position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected.status === 'suspended' ? 'rgba(239,68,68,0.1)' : '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected.status === 'suspended' ? '#f87171' : '#60a5fa', fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
                {(selected.full_name || selected.email || '?')[0].toUpperCase()}
              </div>
              <p style={{ color: t.text, fontWeight: 600, margin: '0 0 2px', fontSize: 14 }}>{selected.full_name || '—'}</p>
              <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 10px' }}>{selected.email}</p>
              {selected.phone && <p style={{ color: t.textGhost, fontSize: 11, margin: '0 0 4px' }}>{selected.phone}</p>}
              {selected.country && <p style={{ color: t.textGhost, fontSize: 11, margin: '0 0 10px' }}>{selected.country}{selected.city ? `, ${selected.city}` : ''}</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(() => {
                  const rc = ROLE_COLOR[selected.role] ?? ROLE_COLOR.viewer
                  return <span style={{ padding: '2px 10px', borderRadius: 999, background: rc.bg, color: rc.text, fontSize: 11, fontWeight: 500 }}>{ROLE_LABELS[selected.role] ?? selected.role}</span>
                })()}
                <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: selected.status === 'suspended' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: selected.status === 'suspended' ? '#f87171' : '#4ade80' }}>
                  {selected.status === 'suspended' ? 'inactive' : 'active'}
                </span>
              </div>
            </div>

            <p style={{ color: t.textGhost, fontSize: 11, margin: '0 0 4px' }}>Joined {new Date(selected.created_at).toLocaleDateString()}</p>
            {selected.last_login && <p style={{ color: t.textGhost, fontSize: 11, margin: '0 0 12px' }}>Last login {fmtTime(selected.last_login)}</p>}

            {/* Activity */}
            <p style={{ color: t.textGhost, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Recent activity</p>
            {selectedActivity.length === 0 ? (
              <p style={{ color: t.textGhost, fontSize: 12 }}>No activity yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedActivity.map(a => (
                  <div key={a.id} style={{ fontSize: 11, color: t.textMuted, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.borderStrong, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: t.textSub }}>{a.action.replace(/_/g, ' ')}</span>
                      {a.entity_name && <span style={{ color: t.textGhost }}> {a.entity_name}</span>}
                      <span style={{ color: t.textGhost, marginLeft: 4 }}>· {fmtTime(a.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <Modal title="Invite User" onClose={() => setInviteOpen(false)} onSave={submitInvite} saving={inviting} saveLabel="Send Invite">
          {!adminAvailable && (
            <div style={{ padding: '10px 12px', borderRadius: 7, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 12 }}>
              Add <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 4px', borderRadius: 3 }}>VITE_SUPABASE_SERVICE_KEY</code> to Vercel env vars to enable invites.
            </div>
          )}
          <Field label="Full Name" value={inviteForm.full_name} onChange={v => setInviteForm(f => ({ ...f, full_name: v }))} placeholder="John Doe" />
          <Field label="Phone" value={inviteForm.phone} onChange={v => setInviteForm(f => ({ ...f, phone: v }))} placeholder="+46 70 000 0000" />
          <Field label="Email address" value={inviteForm.email} onChange={v => setInviteForm(f => ({ ...f, email: v }))} type="email" placeholder="name@company.com" />
          <Select label="Role" value={inviteForm.role} onChange={v => setInviteForm(f => ({ ...f, role: v }))}
            options={availableRoles.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))} />
          <Select
            label="Country"
            value={inviteForm.country}
            onChange={v => setInviteForm(f => ({ ...f, country: v, city: '' }))}
            options={[{ value: '', label: 'Select country…' }, ...countries.map(c => ({ value: c.name, label: c.name }))]}
          />
          <Field
            label="City"
            value={inviteForm.city}
            onChange={v => setInviteForm(f => ({ ...f, city: v }))}
            placeholder={inviteForm.country ? 'Enter city' : 'Select a country first'}
            disabled={!inviteForm.country}
          />
        </Modal>
      )}
    </div>
  )
}

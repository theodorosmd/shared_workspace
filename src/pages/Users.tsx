import { useEffect, useState, useCallback } from 'react'
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
}
interface AuditEntry { id: string; action: string; entity_name: string | null; actor_email: string | null; created_at: string }

const ROLE_LEVELS: Record<string, number> = { superadmin: 4, admin: 3, manager: 2, employee: 1, viewer: 0 }
const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc' },
  admin:      { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  manager:    { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa' },
  employee:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  viewer:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
}

function fmtTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
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
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' })
  const [inviting, setInviting] = useState(false)
  const [suspending, setSuspending] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setMyId(data.user.id)
      supabase.from('profiles').select('role').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p) setMyRole(p.role) })
    })
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500)
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

  const availableRoles = myRole === 'superadmin'
    ? ['superadmin', 'admin', 'manager', 'employee', 'viewer']
    : ['admin', 'manager', 'employee', 'viewer']

  const canEdit = (targetRole: string) =>
    (ROLE_LEVELS[myRole] ?? 0) > (ROLE_LEVELS[targetRole] ?? 0)

  const changeRole = async (id: string, role: string, email: string) => {
    const prev = users
    setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
    if (selected?.id === id) setSelected(s => s ? { ...s, role } : s)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { toast(error.message, 'error'); setUsers(prev); return }
    toast('Role updated')
    logAction('role_changed', 'user', id, email, { new_role: role })
  }

  const toggleSuspend = async (user: Profile) => {
    const isSuspended = user.status === 'suspended'
    const action = isSuspended ? 'unsuspend' : 'suspend'
    const ok = await confirm({
      title: isSuspended ? `Unsuspend ${user.email}?` : `Suspend ${user.email}?`,
      message: isSuspended
        ? 'They will be able to sign in again.'
        : 'They will be immediately logged out and unable to sign in.',
      danger: !isSuspended,
      confirmLabel: isSuspended ? 'Unsuspend' : 'Suspend',
    })
    if (!ok) return
    setSuspending(true)
    try {
      if (isSuspended) await unbanUser(user.id)
      else await banUser(user.id)
      const newStatus = isSuspended ? 'active' : 'suspended'
      await supabase.from('profiles').update({ status: newStatus, suspended_at: isSuspended ? null : new Date().toISOString() }).eq('id', user.id)
      setUsers(p => p.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
      setSelected(s => s?.id === user.id ? { ...s, status: newStatus } : s)
      toast(isSuspended ? 'User unsuspended' : 'User suspended')
      logAction(action + 'd', 'user', user.id, user.email)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Action failed', 'error')
    }
    setSuspending(false)
  }

  const submitInvite = async () => {
    if (!inviteForm.email.trim()) { toast('Email is required', 'error'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) { toast('Enter a valid email address', 'error'); return }
    if (!adminAvailable) { toast('Admin Edge Function not deployed — run: supabase functions deploy admin-ops', 'error'); return }
    setInviting(true)
    try {
      await inviteUser(inviteForm.email.trim(), inviteForm.role)
      toast(`Invite sent to ${inviteForm.email}`)
      logAction('invited', 'user', undefined, inviteForm.email, { role: inviteForm.role })
      setInviteOpen(false); setInviteForm({ email: '', role: 'viewer' })
      setTimeout(loadUsers, 1500)
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
                <thead>
                  <tr>
                    {['User', 'Role', 'Status', 'Joined'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 18px', color: t.textMuted, fontWeight: 500, borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const rc = ROLE_COLOR[u.role] ?? ROLE_COLOR.viewer
                    const editable = canEdit(u.role)
                    const isSuspended = u.status === 'suspended'
                    return (
                      <tr key={u.id} onClick={() => setSelected(s => s?.id === u.id ? null : u)}
                        style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer', background: selected?.id === u.id ? t.surface : 'transparent', transition: 'background 0.1s' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSuspended ? 'rgba(239,68,68,0.1)' : '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSuspended ? '#f87171' : '#60a5fa', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                              {(u.full_name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p style={{ color: t.text, fontWeight: 500, margin: 0, opacity: isSuspended ? 0.5 : 1 }}>{u.full_name || '—'}</p>
                              <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {editable ? (
                            <select value={u.role || 'viewer'}
                              onChange={e => { e.stopPropagation(); changeRole(u.id, e.target.value, u.email) }}
                              onClick={e => e.stopPropagation()}
                              style={{ padding: '3px 8px', background: rc.bg, border: `1px solid ${rc.text}44`, borderRadius: 999, color: rc.text, fontSize: 11, fontWeight: 500, cursor: 'pointer', outline: 'none', appearance: 'none', paddingRight: 20, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(rc.text)}' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 5px center' }}>
                              {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: rc.bg, color: rc.text, fontSize: 11, fontWeight: 500 }}>{u.role || 'viewer'}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: isSuspended ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: isSuspended ? '#f87171' : '#4ade80' }}>
                            {isSuspended ? 'suspended' : 'active'}
                          </span>
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
            {/* Avatar + name */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected.status === 'suspended' ? 'rgba(239,68,68,0.1)' : '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected.status === 'suspended' ? '#f87171' : '#60a5fa', fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
                {(selected.full_name || selected.email || '?')[0].toUpperCase()}
              </div>
              <p style={{ color: t.text, fontWeight: 600, margin: '0 0 2px', fontSize: 14 }}>{selected.full_name || '—'}</p>
              <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 10px' }}>{selected.email}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(() => {
                  const rc = ROLE_COLOR[selected.role] ?? ROLE_COLOR.viewer
                  return <span style={{ padding: '2px 10px', borderRadius: 999, background: rc.bg, color: rc.text, fontSize: 11, fontWeight: 500 }}>{selected.role}</span>
                })()}
                <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: selected.status === 'suspended' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: selected.status === 'suspended' ? '#f87171' : '#4ade80' }}>
                  {selected.status ?? 'active'}
                </span>
              </div>
            </div>

            <p style={{ color: t.textGhost, fontSize: 11, margin: '0 0 12px' }}>Joined {new Date(selected.created_at).toLocaleDateString()}</p>

            {/* Suspend button */}
            {canEdit(selected.role) && selected.id !== myId && (
              <button
                onClick={() => toggleSuspend(selected)}
                disabled={suspending}
                style={{
                  width: '100%', padding: '8px', borderRadius: 7, border: `1px solid ${selected.status === 'suspended' ? '#22c55e44' : '#ef444444'}`,
                  background: selected.status === 'suspended' ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                  color: selected.status === 'suspended' ? '#4ade80' : '#f87171',
                  fontSize: 12, cursor: suspending ? 'not-allowed' : 'pointer', marginBottom: 16, opacity: suspending ? 0.6 : 1,
                }}
              >
                {suspending ? '…' : selected.status === 'suspended' ? 'Unsuspend user' : 'Suspend user'}
              </button>
            )}

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
          <Field label="Email address" value={inviteForm.email} onChange={v => setInviteForm({ ...inviteForm, email: v })} type="email" placeholder="name@company.com" />
          <Select label="Role" value={inviteForm.role} onChange={v => setInviteForm({ ...inviteForm, role: v })}
            options={availableRoles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'
import { PageHeader } from '@/components/ui'

interface Profile { id: string; email: string; full_name: string; role: string; created_at: string }


export default function Users() {
  const { t } = useTheme()
  const { toast } = useFeedback()
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data: u, error }) => {
        if (error) toast(error.message, 'error')
        setUsers(u ?? []); setFiltered(u ?? []); setLoading(false)
      })
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter(u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)))
  }, [search, users])

  const changeRole = async (id: string, role: string) => {
    const prev = users
    setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { toast(error.message, 'error'); setUsers(prev); return }
    toast('Role updated')
  }

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <PageHeader title="Users" sub="Manage platform users" />

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 300, marginBottom: 24 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          style={{ width: '100%', padding: '8px 12px 8px 32px', background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.inputText, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => (e.target.style.borderColor = '#3b82f6')}
          onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
      ) : (
        <div className="table-wrap" style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
            <thead>
              <tr>
                {['User', 'Role', 'Joined'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 18px', color: t.textMuted, fontWeight: 500, borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: t.text, fontWeight: 500, margin: 0 }}>{u.full_name || '—'}</p>
                        <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <select value={u.role || 'viewer'} onChange={e => changeRole(u.id, e.target.value)}
                      style={{ padding: '3px 8px', background: t.input, border: `1px solid ${t.borderStrong}`, borderRadius: 5, color: t.text, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                      {['admin', 'manager', 'employee', 'viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 18px', color: t.textMuted }}>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

const ROLE_LEVELS: Record<string, number> = { superadmin: 4, admin: 3, manager: 2, employee: 1, viewer: 0 }

export default function ProtectedRoute({ children, minRole }: { children: React.ReactNode; minRole?: string }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) {
        supabase.from('users').select('role').eq('id', s.user.id).single()
          .then(({ data }) => setRole(data?.role ?? 'viewer'))
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) {
        supabase.from('users').select('role').eq('id', s.user.id).single()
          .then(({ data }) => setRole(data?.role ?? 'viewer'))
      } else {
        setRole(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined || (session && minRole && role === null)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (minRole && (ROLE_LEVELS[role ?? 'viewer'] ?? 0) < (ROLE_LEVELS[minRole] ?? 0)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

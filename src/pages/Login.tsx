import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Subtle grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360, padding: '0 24px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 0 1px rgba(59,130,246,0.3), 0 4px 24px rgba(59,130,246,0.2)',
          }}>
            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', margin: 0 }}>
            Suryoyo Sat
          </h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 6, letterSpacing: '0.02em' }}>
            Admin access only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Email address"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: '#111318',
                  border: '1px solid #1e2229',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                  letterSpacing: '0.01em',
                }}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = '#1e2229')}
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: '#111318',
                  border: '1px solid #1e2229',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                  letterSpacing: '0.08em',
                }}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = '#1e2229')}
              />
            </div>

            {error && (
              <p style={{ color: '#f87171', fontSize: 12, margin: 0, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '11px',
                background: loading ? '#1d4ed8' : '#2563eb',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'background 0.15s, transform 0.1s',
                boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8' }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb' }}
            >
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', color: '#1e2a3a', fontSize: 12, marginTop: 40, letterSpacing: '0.02em' }}>
          © 2025 Suryoyo Sat
        </p>
      </div>
    </div>
  )
}

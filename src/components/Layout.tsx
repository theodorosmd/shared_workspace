import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useIsMobile } from '@/lib/useMediaQuery'
import CommandPalette from '@/components/CommandPalette'

const nav = [
  { to: '/', label: 'Dashboard', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { to: '/countries', label: 'Countries', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { to: '/users', label: 'Users', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  { to: '/programs', label: 'Programs', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> },
  { to: '/channels', label: 'Channels', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
  { to: '/settings/roles', label: 'Settings', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { to: '/support', label: 'Support', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  { to: '/audit', label: 'Audit Log', icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
]

function MoonIcon() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
}
function SunIcon() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<{ email: string; full_name: string; avatar_url: string | null } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { t, theme, toggle } = useTheme()
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('users').select('email, full_name, avatar_url').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p) setUserProfile(p) })
    })
  }, [])

  // Close drawer on route change (mobile)
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // On mobile, the sidebar is always expanded (no collapse); collapse only applies to desktop
  const isCollapsed = !isMobile && collapsed

  const btnBase = (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: isCollapsed ? '7px 0' : '7px 10px',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    borderRadius: 6, background: 'transparent', border: 'none',
    color: t.textGhost, cursor: 'pointer', width: '100%', fontSize: 13,
    transition: 'all 0.1s', whiteSpace: 'nowrap' as const,
  })

  const sidebar = (
    <aside style={{
      width: isMobile ? 240 : (collapsed ? 52 : 220),
      transition: 'width 0.2s ease',
      background: t.surface,
      borderRight: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
      height: '100%',
      ...(isMobile ? { position: 'fixed' as const, top: 0, left: 0, zIndex: 100, transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease', boxShadow: drawerOpen ? '0 0 40px rgba(0,0,0,0.4)' : 'none' } : {}),
    }}>
      {/* Logo */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: isCollapsed ? '0' : '0 16px', justifyContent: isCollapsed ? 'center' : 'flex-start', borderBottom: `1px solid ${t.border}`, gap: 10 }}>
        <img src="/logo.png" alt="Suryoyo Sat" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
        {!isCollapsed && <span style={{ color: t.text, fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>Suryoyo Sat</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCollapsed ? '7px 0' : '7px 10px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              borderRadius: 6, textDecoration: 'none', fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? t.navActiveText : t.navText,
              background: isActive ? t.navActive : 'transparent',
              transition: 'all 0.1s', whiteSpace: 'nowrap',
            })}
          >
            {icon}
            {!isCollapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '8px 6px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {userProfile && (
          <NavLink to="/profile" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isCollapsed ? '7px 0' : '7px 10px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            borderRadius: 6, textDecoration: 'none', fontSize: 12,
            color: isActive ? t.navActiveText : t.textSub,
            background: isActive ? t.navActive : 'transparent',
            transition: 'all 0.1s', marginBottom: 2,
          })}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: 10, fontWeight: 600, flexShrink: 0, overflow: 'hidden' }}>
              {userProfile.avatar_url
                ? <img src={userProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (userProfile.full_name || userProfile.email || '?')[0].toUpperCase()}
            </div>
            {!isCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile.full_name || userProfile.email}</span>}
          </NavLink>
        )}
        <button onClick={toggle} style={btnBase()}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        {!isMobile && (
          <button onClick={() => setCollapsed(!collapsed)} style={btnBase()}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />}
            </svg>
            {!isCollapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          onClick={handleLogout}
          style={btnBase()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.dangerText; (e.currentTarget as HTMLElement).style.background = t.danger }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textGhost; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      {sidebar}

      {/* Mobile backdrop */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, animation: 'fadeIn 0.15s ease' }} />
      )}

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', background: t.bg, width: '100%' }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, height: 52, padding: '0 16px', background: t.surface, borderBottom: `1px solid ${t.border}` }}>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'transparent', border: 'none', color: t.textSub, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>Suryoyo Sat</span>
          </div>
        )}
        <Outlet />
      </main>

      <CommandPalette />
    </div>
  )
}

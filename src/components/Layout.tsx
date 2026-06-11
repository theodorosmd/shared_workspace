import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useIsMobile } from '@/lib/useMediaQuery'
import CommandPalette from '@/components/CommandPalette'
import {
  LayoutDashboard, Globe, Users, Upload, Tv2, Settings,
  LifeBuoy, ClipboardList, Sun, Moon, ChevronLeft, ChevronRight,
  LogOut, Menu,
} from 'lucide-react'

const nav = [
  { to: '/',              label: 'Dashboard',  icon: <LayoutDashboard size={15} /> },
  { to: '/countries',     label: 'Countries',  icon: <Globe size={15} /> },
  { to: '/users',         label: 'Users',      icon: <Users size={15} /> },
  { to: '/programs',      label: 'Programs',   icon: <Upload size={15} /> },
  { to: '/channels',      label: 'Channels',   icon: <Tv2 size={15} /> },
  { to: '/settings/roles',label: 'Roles',      icon: <Settings size={15} /> },
  { to: '/support',       label: 'Support',    icon: <LifeBuoy size={15} /> },
  { to: '/audit',         label: 'Audit Log',  icon: <ClipboardList size={15} /> },
]

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

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

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
        <img src="/logo2.svg" alt="Suryoyo Sat" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
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
            title={isCollapsed ? label : undefined}
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
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        {!isMobile && (
          <button onClick={() => setCollapsed(!collapsed)} style={btnBase()} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          onClick={handleLogout}
          style={btnBase()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.dangerText; (e.currentTarget as HTMLElement).style.background = t.danger }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textGhost; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={15} />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      {sidebar}

      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, animation: 'fadeIn 0.15s ease' }} />
      )}

      <main style={{ flex: 1, overflowY: 'auto', background: t.bg, width: '100%' }}>
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, height: 52, padding: '0 16px', background: t.surface, borderBottom: `1px solid ${t.border}` }}>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'transparent', border: 'none', color: t.textSub, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <Menu size={20} />
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

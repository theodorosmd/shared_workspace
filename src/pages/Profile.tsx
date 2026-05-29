import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useFeedback } from '@/lib/feedback'

interface UserProfile { id: string; email: string; full_name: string; role: string; avatar_url: string | null }
interface MFAFactor { id: string; factor_type: string; status: string }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTheme()
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, padding: '24px', marginBottom: 16 }}>
      <h2 style={{ color: t.text, fontSize: 14, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.2px' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function Profile() {
  const { t } = useTheme()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const avatarRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [pwForm, setPwForm] = useState({ newPw: '', confirmPw: '' })
  const [savingPw, setSavingPw] = useState(false)

  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [verifyingMfa, setVerifyingMfa] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)

  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const [session, setSession] = useState<{ created_at: string | null }>({ created_at: null })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return navigate('/login')
      supabase.from('profiles').select('*').eq('id', data.user.id).single()
        .then(({ data: p }) => {
          if (p) { setProfile(p); setName(p.full_name ?? '') }
        })
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession({ created_at: data.session.user.created_at ?? null })
    })
    loadMFA()
  }, [])

  const loadMFA = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      setMfaFactors(data?.all ?? [])
    } catch (_e) { /* MFA may not be enabled on this project */ }
  }

  const saveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', profile.id)
    setSavingProfile(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Profile updated')
    setProfile(p => p ? { ...p, full_name: name } : p)
  }

  const uploadAvatar = async (file: File) => {
    if (!profile) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setUploadingAvatar(false); toast(upErr.message, 'error'); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
    setProfile(p => p ? { ...p, avatar_url: publicUrl } : p)
    setUploadingAvatar(false)
    toast('Avatar updated')
  }

  const changePassword = async () => {
    if (!pwForm.newPw) { toast('Enter a new password', 'error'); return }
    if (pwForm.newPw !== pwForm.confirmPw) { toast('Passwords do not match', 'error'); return }
    if (pwForm.newPw.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setSavingPw(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Password updated')
    setPwForm({ newPw: '', confirmPw: '' })
  }

  const startEnrollMFA = async () => {
    setEnrolling(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error
      setQrCode(data.totp.qr_code)
      setEnrollFactorId(data.id)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed to start 2FA setup', 'error')
    }
    setEnrolling(false)
  }

  const verifyMFA = async () => {
    if (!enrollFactorId || !totpCode) return
    setVerifyingMfa(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollFactorId, code: totpCode })
      if (error) throw error
      toast('2FA enabled successfully')
      setQrCode(null); setEnrollFactorId(null); setTotpCode('')
      loadMFA()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Invalid code', 'error')
    }
    setVerifyingMfa(false)
  }

  const unenrollMFA = async (factorId: string) => {
    setUnenrolling(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      toast('2FA disabled')
      loadMFA()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed to disable 2FA', 'error')
    }
    setUnenrolling(false)
  }

  const logOutAllDevices = async () => {
    setLoggingOutAll(true)
    await supabase.auth.signOut({ scope: 'global' })
    navigate('/login')
  }

  const verifiedFactor = mfaFactors.find(f => f.factor_type === 'totp' && f.status === 'verified')
  const inputBase: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: t.input, border: `1px solid ${t.inputBorder}`,
    borderRadius: 7, color: t.inputText, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const btnPrimary: React.CSSProperties = { padding: '9px 18px', borderRadius: 7, border: 'none', background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
  const btnSecondary: React.CSSProperties = { padding: '9px 18px', borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textSub, fontSize: 13, cursor: 'pointer' }

  if (!profile) return <div style={{ padding: 48, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>

  return (
    <div className="page" style={{ minHeight: '100%', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: t.text, fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Profile</h1>
        <p style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>Manage your account settings</p>
      </div>

      {/* Avatar + name */}
      <Section title="Personal information">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => avatarRef.current?.click()}
              style={{ width: 64, height: 64, borderRadius: '50%', background: '#2563eb22', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: `2px solid ${t.borderStrong}` }}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#60a5fa', fontSize: 24, fontWeight: 600 }}>{(profile.full_name || profile.email || '?')[0].toUpperCase()}</span>
              }
              {uploadingAvatar && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11 }}>…</div>
              )}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
          </div>
          <div>
            <p style={{ color: t.text, fontWeight: 500, margin: '0 0 2px' }}>{profile.full_name || 'No name set'}</p>
            <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>{profile.email}</p>
            <p style={{ color: t.textGhost, fontSize: 11, margin: '4px 0 0', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => avatarRef.current?.click()}>Change avatar</p>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputBase}
            onFocus={e => (e.target.style.borderColor = '#3b82f6')}
            onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>Email</label>
          <input value={profile.email} disabled style={{ ...inputBase, opacity: 0.5, cursor: 'not-allowed' }} />
        </div>
        <button onClick={saveProfile} disabled={savingProfile} style={{ ...btnPrimary, opacity: savingProfile ? 0.7 : 1 }}>
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </Section>

      {/* Password */}
      <Section title="Change password">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>New password</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} style={inputBase} placeholder="Min 8 characters"
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>Confirm password</label>
            <input type="password" value={pwForm.confirmPw} onChange={e => setPwForm({ ...pwForm, confirmPw: e.target.value })} style={inputBase}
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
          </div>
        </div>
        <button onClick={changePassword} disabled={savingPw} style={{ ...btnPrimary, opacity: savingPw ? 0.7 : 1 }}>
          {savingPw ? 'Updating…' : 'Update password'}
        </button>
      </Section>

      {/* 2FA */}
      <Section title="Two-factor authentication">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: verifiedFactor || qrCode ? 16 : 0 }}>
          <div>
            <p style={{ color: t.text, fontSize: 13, margin: '0 0 2px', fontWeight: 500 }}>Authenticator app (TOTP)</p>
            <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>
              {verifiedFactor ? 'Enabled — your account is protected.' : 'Add an extra layer of security.'}
            </p>
          </div>
          {verifiedFactor ? (
            <button onClick={() => unenrollMFA(verifiedFactor.id)} disabled={unenrolling}
              style={{ ...btnSecondary, color: '#f87171', borderColor: '#ef444444', opacity: unenrolling ? 0.6 : 1 }}>
              {unenrolling ? '…' : 'Disable'}
            </button>
          ) : !qrCode ? (
            <button onClick={startEnrollMFA} disabled={enrolling} style={{ ...btnPrimary, opacity: enrolling ? 0.7 : 1 }}>
              {enrolling ? 'Setting up…' : 'Enable 2FA'}
            </button>
          ) : null}
        </div>

        {qrCode && (
          <div>
            <p style={{ color: t.textMuted, fontSize: 12, marginBottom: 12 }}>Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div style={{ display: 'inline-block', padding: 12, background: 'white', borderRadius: 8, marginBottom: 16 }}>
              <img src={qrCode} alt="2FA QR Code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code" maxLength={6} style={{ ...inputBase, maxWidth: 160, letterSpacing: '0.2em', textAlign: 'center' }}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
              <button onClick={verifyMFA} disabled={totpCode.length !== 6 || verifyingMfa} style={{ ...btnPrimary, opacity: totpCode.length !== 6 ? 0.5 : 1 }}>
                {verifyingMfa ? 'Verifying…' : 'Verify'}
              </button>
              <button onClick={() => { setQrCode(null); setEnrollFactorId(null) }} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}
      </Section>

      {/* Sessions */}
      <Section title="Sessions & devices">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>Current session</p>
            {session.created_at && (
              <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>Account since {new Date(session.created_at).toLocaleDateString()}</p>
            )}
          </div>
          <button onClick={logOutAllDevices} disabled={loggingOutAll}
            style={{ ...btnSecondary, color: '#f87171', borderColor: '#ef444444', opacity: loggingOutAll ? 0.6 : 1 }}>
            {loggingOutAll ? '…' : 'Log out all devices'}
          </button>
        </div>
      </Section>
    </div>
  )
}

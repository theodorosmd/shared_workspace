import { createContext, useContext, useState, useCallback } from 'react'
import { Check, X, Info } from 'lucide-react'
import { useTheme } from '@/lib/theme'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; type: ToastType; message: string }

interface ConfirmOpts { title: string; message?: string; danger?: boolean; confirmLabel?: string }
interface ConfirmState extends ConfirmOpts { resolve: (v: boolean) => void }

interface FeedbackCtx {
  toast: (message: string, type?: ToastType) => void
  confirm: (opts: ConfirmOpts) => Promise<boolean>
}

const Ctx = createContext<FeedbackCtx>({} as FeedbackCtx)

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check size={15} />,
  error:   <X size={15} />,
  info:    <Info size={15} />,
}
const ACCENT: Record<ToastType, string> = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' }

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTheme()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3800)
  }, [])

  const confirm = useCallback((opts: ConfirmOpts) =>
    new Promise<boolean>(resolve => setConfirmState({ ...opts, resolve })), [])

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: t.surface, border: `1px solid ${t.borderStrong}`,
            borderLeft: `3px solid ${ACCENT[toast.type]}`,
            borderRadius: 8, padding: '11px 16px', minWidth: 240, maxWidth: 360,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)', pointerEvents: 'auto',
            animation: 'slideIn 0.2s ease',
          }}>
            <span style={{ color: ACCENT[toast.type], display: 'flex', flexShrink: 0 }}>{ICONS[toast.type]}</span>
            <span style={{ color: t.text, fontSize: 13, lineHeight: 1.4 }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div data-overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 16 }}
          onClick={() => closeConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, width: '100%', maxWidth: 380, padding: 24 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.2px' }}>{confirmState.title}</h2>
            {confirmState.message && <p style={{ color: t.textMuted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>{confirmState.message}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: confirmState.message ? 0 : 20 }}>
              <button onClick={() => closeConfirm(false)} style={{ flex: 1, padding: '9px', borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.textSub, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => closeConfirm(true)} style={{ flex: 1, padding: '9px', borderRadius: 7, border: 'none', background: confirmState.danger ? '#dc2626' : '#2563eb', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{confirmState.confirmLabel ?? 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useFeedback = () => useContext(Ctx)

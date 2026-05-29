import { Component } from 'react'
import type { ReactNode } from 'react'

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', background: '#0f1117' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" stroke="#f87171" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Something went wrong</p>
            <p style={{ color: '#64748b', fontSize: 12, maxWidth: 360, lineHeight: 1.6, margin: 0, padding: '0 16px' }}>
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isMisconfigured } from './lib/supabase.ts'
import { ThemeProvider } from './lib/theme.tsx'
import { FeedbackProvider } from './lib/feedback.tsx'

function MissingConfig() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', margin: '0 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Configuration required</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Add these environment variables in Vercel, then redeploy:</p>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 2, color: '#1e293b' }}>
          <div>VITE_SUPABASE_URL=https://xxxx.supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=your-anon-key</div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>Supabase → Project Settings → API</p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FeedbackProvider>
        {isMisconfigured ? <MissingConfig /> : <App />}
      </FeedbackProvider>
    </ThemeProvider>
  </StrictMode>,
)

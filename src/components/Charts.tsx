interface BarData { label: string; value: number }

export function MiniBarChart({ data, color = '#3b82f6' }: { data: BarData[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{
            width: '100%', borderRadius: '2px 2px 0 0',
            height: d.value === 0 ? 2 : `${Math.max((d.value / max) * 100, 12)}%`,
            background: color,
            opacity: d.value === 0 ? 0.12 : 0.82,
          }} />
        </div>
      ))}
    </div>
  )
}

interface Segment { label: string; value: number; color: string }

export function SegmentedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) {
    return <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
  }
  return (
    <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height: 8, gap: 1 }}>
      {segments.filter(s => s.value > 0).map((s, i) => (
        <div key={i} title={`${s.label}: ${s.value}`} style={{ flex: s.value / total, background: s.color }} />
      ))}
    </div>
  )
}

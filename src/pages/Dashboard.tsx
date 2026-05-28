import { useEffect, useState } from 'react'
import { Globe, Users, Upload, LifeBuoy, TrendingUp, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Stats {
  countries: number
  users: number
  programs: number
  openTickets: number
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ countries: 0, users: 0, programs: 0, openTickets: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [countries, users, programs, tickets] = await Promise.all([
        supabase.from('countries').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('programs').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])

      setStats({
        countries: countries.count ?? 0,
        users: users.count ?? 0,
        programs: programs.count ?? 0,
        openTickets: tickets.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome to Suryoyo Sat admin panel</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Countries" value={loading ? '—' : stats.countries} icon={Globe} color="bg-blue-500" />
        <StatCard label="Users" value={loading ? '—' : stats.users} icon={Users} color="bg-violet-500" />
        <StatCard label="Programs" value={loading ? '—' : stats.programs} icon={Upload} color="bg-emerald-500" />
        <StatCard label="Open Tickets" value={loading ? '—' : stats.openTickets} icon={LifeBuoy} color="bg-amber-500" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Add a new country', href: '/countries' },
              { label: 'Upload a program', href: '/programs' },
              { label: 'View open tickets', href: '/support' },
              { label: 'Manage user roles', href: '/settings/roles' },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700 group"
              >
                <span>{action.label}</span>
                <span className="text-slate-400 group-hover:text-slate-600">→</span>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">System Status</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'API', status: 'Operational' },
              { label: 'Database', status: 'Operational' },
              { label: 'Storage', status: 'Operational' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item.label}</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

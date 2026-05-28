import { useEffect, useState } from 'react'
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Ticket {
  id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  employee_email: string
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
}

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium', employee_email: '' })

  const fetchTickets = async () => {
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setTickets(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTickets() }, [filter])

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('support_tickets').update({ status }).eq('id', id)
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: status as Ticket['status'] } : t)))
    if (selected?.id === id) setSelected((t) => t ? { ...t, status: status as Ticket['status'] } : t)
  }

  const handleCreate = async () => {
    await supabase.from('support_tickets').insert({ ...form, status: 'open' })
    setShowNew(false)
    setForm({ subject: '', message: '', priority: 'medium', employee_email: '' })
    fetchTickets()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-slate-500 mt-1">Employee support requests</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'open', 'in_progress', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === s
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Ticket list */}
        <div className="flex-1 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tickets found.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
                  selected?.id === t.id
                    ? 'border-blue-400 ring-1 ring-blue-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{t.subject}</p>
                    <p className="text-sm text-slate-500 truncate mt-0.5">{t.employee_email}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[t.priority]}`}>
                      {t.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(t.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 shrink-0 bg-white rounded-xl border border-slate-200 p-6 h-fit sticky top-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-slate-600" />
              <h2 className="font-semibold text-slate-900">Ticket Detail</h2>
            </div>
            <h3 className="font-medium text-slate-900 mb-1">{selected.subject}</h3>
            <p className="text-sm text-slate-500 mb-1">{selected.employee_email}</p>
            <p className="text-sm text-slate-700 mt-4 mb-6">{selected.message}</p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Change Status</label>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">New Ticket</h2>
            <div className="space-y-4">
              {[
                { label: 'Employee Email', field: 'employee_email', type: 'email' },
                { label: 'Subject', field: 'subject', type: 'text' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

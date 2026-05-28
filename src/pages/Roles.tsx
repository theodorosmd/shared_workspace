import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  created_at: string
}

const ALL_PERMISSIONS = [
  'view_dashboard',
  'manage_users',
  'manage_countries',
  'upload_programs',
  'view_programs',
  'manage_tickets',
  'view_tickets',
  'manage_roles',
]

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] })

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('name')
    setRoles(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRoles() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', description: '', permissions: [] })
    setShowModal(true)
  }

  const openEdit = (r: Role) => {
    setEditing(r)
    setForm({ name: r.name, description: r.description, permissions: r.permissions ?? [] })
    setShowModal(true)
  }

  const togglePermission = (p: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p)
        ? f.permissions.filter((x) => x !== p)
        : [...f.permissions, p],
    }))
  }

  const handleSave = async () => {
    if (editing) {
      await supabase.from('roles').update(form).eq('id', editing.id)
    } else {
      await supabase.from('roles').insert(form)
    }
    setShowModal(false)
    fetchRoles()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role?')) return
    await supabase.from('roles').delete().eq('id', id)
    fetchRoles()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings — Roles</h1>
          <p className="text-slate-500 mt-1">Define roles and their permissions</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-400">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-white rounded-xl border border-slate-200">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No roles yet.</p>
          </div>
        ) : (
          roles.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900 capitalize">{r.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-3">{r.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {(r.permissions ?? []).map((p) => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                    {p.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-5">
              {editing ? 'Edit Role' : 'New Role'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p)}
                        onChange={() => togglePermission(p)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{p.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                {editing ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

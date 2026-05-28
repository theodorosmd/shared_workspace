import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Country {
  id: string
  name: string
  code: string
  region: string
  created_at: string
}

export default function Countries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Country | null>(null)
  const [form, setForm] = useState({ name: '', code: '', region: '' })

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name')
    setCountries(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCountries() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', code: '', region: '' })
    setShowModal(true)
  }

  const openEdit = (c: Country) => {
    setEditing(c)
    setForm({ name: c.name, code: c.code, region: c.region })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editing) {
      await supabase.from('countries').update(form).eq('id', editing.id)
    } else {
      await supabase.from('countries').insert(form)
    }
    setShowModal(false)
    fetchCountries()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this country?')) return
    await supabase.from('countries').delete().eq('id', id)
    fetchCountries()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Countries</h1>
          <p className="text-slate-500 mt-1">Manage available countries</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Country
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : countries.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No countries yet. Add your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Code</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Region</th>
                <th className="text-right px-6 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 text-slate-600 uppercase">{c.code}</td>
                  <td className="px-6 py-4 text-slate-600">{c.region}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">
              {editing ? 'Edit Country' : 'Add Country'}
            </h2>
            <div className="space-y-4">
              {(['name', 'code', 'region'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 capitalize">
                    {field}
                  </label>
                  <input
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
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
                {editing ? 'Save Changes' : 'Add Country'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

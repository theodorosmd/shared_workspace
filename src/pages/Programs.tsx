import { useEffect, useState, useRef } from 'react'
import { Upload, FileVideo, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Program {
  id: string
  title: string
  description: string
  file_url: string
  country_id: string
  created_at: string
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchPrograms = async () => {
    const { data } = await supabase.from('programs').select('*').order('created_at', { ascending: false })
    setPrograms(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPrograms() }, [])

  const handleUpload = async () => {
    if (!form.title || !file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `programs/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('programs')
      .upload(path, file)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('programs').getPublicUrl(path)
      await supabase.from('programs').insert({ ...form, file_url: publicUrl })
    }

    setUploading(false)
    setShowModal(false)
    setForm({ title: '', description: '' })
    setFile(null)
    fetchPrograms()
  }

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm('Delete this program?')) return
    const path = fileUrl.split('/programs/')[1]
    await supabase.storage.from('programs').remove([`programs/${path}`])
    await supabase.from('programs').delete().eq('id', id)
    fetchPrograms()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programs Uploaded</h1>
          <p className="text-slate-500 mt-1">Manage uploaded programs and content</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Program
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading...</div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileVideo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No programs yet. Upload your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programs.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileVideo className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex gap-1">
                  {p.file_url && (
                    <a
                      href={p.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(p.id, p.file_url)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{p.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{p.description}</p>
              <p className="text-xs text-slate-400 mt-3">
                {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Upload Program</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">File</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {file ? (
                    <p className="text-sm text-slate-700 font-medium">{file.name}</p>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Click to select a file</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setFile(null) }}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!form.title || !file || uploading}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

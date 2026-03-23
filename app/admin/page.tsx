'use client'
import { useEffect, useState } from 'react'
import { Upload, Trash2, FileText, Lock, BookOpen, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Document {
  id: string
  name: string
  filename: string
  chunk_count: number
  uploaded_at: string
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const authenticate = () => {
    if (password.length > 0) setAuthenticated(true)
  }

  useEffect(() => {
    if (authenticated) loadDocuments()
  }, [authenticated])

  const loadDocuments = async () => {
    setLoading(true)
    const res = await fetch('/api/documents')
    const data = await res.json()
    setDocuments(data.documents || [])
    setLoading(false)
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('password', password)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok) {
        setUploadStatus({ type: 'success', message: `Dodano "${data.name}" (${data.chunks} fragmentów)` })
        await loadDocuments()
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Błąd przesyłania' })
      }
    } catch {
      setUploadStatus({ type: 'error', message: 'Błąd połączenia' })
    }

    setUploading(false)
    e.target.value = ''
  }

  const deleteDocument = async (id: string, name: string) => {
    if (!confirm(`Usunąć dokument "${name}"?`)) return

    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDocuments(documents.filter(d => d.id !== id))
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-sm">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Lock size={22} className="text-blue-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 text-center mb-6">Panel admina</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && authenticate()}
            placeholder="Hasło"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          <button
            onClick={authenticate}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            Wejdź
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Panel admina</h1>
            <p className="text-xs text-slate-500">Zarządzanie bazą wiedzy</p>
          </div>
        </div>
        <a href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Przejdź do chatu →
        </a>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        {/* Upload */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Dodaj dokument PDF</h2>

          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            uploading ? 'border-slate-200 bg-slate-50' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
          }`}>
            {uploading ? (
              <>
                <Loader2 size={24} className="text-blue-500 animate-spin mb-2" />
                <span className="text-sm text-slate-500">Przetwarzam PDF...</span>
              </>
            ) : (
              <>
                <Upload size={24} className="text-blue-400 mb-2" />
                <span className="text-sm font-medium text-slate-700">Kliknij aby wybrać plik PDF</span>
                <span className="text-xs text-slate-400 mt-1">Tylko pliki .pdf</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={uploadFile}
              disabled={uploading}
            />
          </label>

          {uploadStatus && (
            <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
              uploadStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {uploadStatus.type === 'success'
                ? <CheckCircle size={16} />
                : <AlertCircle size={16} />
              }
              {uploadStatus.message}
            </div>
          )}
        </div>

        {/* Document list */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">
              Dokumenty w bazie ({documents.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Brak dokumentów — dodaj pierwszy PDF</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{doc.name}</p>
                      <p className="text-xs text-slate-400">
                        {doc.chunk_count} fragmentów · {new Date(doc.uploaded_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.id, doc.name)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

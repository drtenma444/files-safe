import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ user, setUser }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    else setFiles(data)
  }

  const handleUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')

    const path = `${user.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('my-files')
      .upload(path, file)

    if (uploadError) {
      setError('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('files').insert({
      user_id: user.id,
      name: file.name,
      size: file.size,
      type: file.type,
      storage_path: path,
    })

    if (dbError) {
      setError('Database insert failed: ' + dbError.message)
      await supabase.storage.from('my-files').remove([path])
      setUploading(false)
      return
    }

    setUploading(false)
    fetchFiles()
  }

  const handleDelete = async (file) => {
    const { error: storageError } = await supabase.storage
      .from('my-files')
      .remove([file.storage_path])
    if (storageError) {
      setError('Delete failed: ' + storageError.message)
      return
    }
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', file.id)
    if (dbError) {
      setError('Database delete failed: ' + dbError.message)
      return
    }
    fetchFiles()
  }

  const handleDownload = async (file) => {
    const { data, error } = await supabase.storage
      .from('my-files')
      .createSignedUrl(file.storage_path, 60)
    if (error) {
      setError('Download failed: ' + error.message)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleLogout = () => {
    // Clear both storages
    localStorage.removeItem('user')
    localStorage.removeItem('user_expiry')
    sessionStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-white">Files</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        {error && <div className="bg-red-900 text-red-200 p-3 rounded mb-4">{error}</div>}

        <label className="block mb-6">
          <span className="sr-only">Choose file</span>
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-900 file:text-blue-200
              hover:file:bg-blue-800
              disabled:opacity-50"
          />
        </label>

        {uploading && <p className="text-gray-400">Uploading...</p>}

        {/* Responsive file cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="bg-gray-800 rounded-lg shadow p-4 flex flex-col">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white truncate" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {formatSize(file.size)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleDownload(file)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              No files yet
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

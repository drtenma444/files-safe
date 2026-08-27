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
    sessionStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">File Vault</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <label className="block mb-6">
          <span className="sr-only">Choose file</span>
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
          />
        </label>

        {uploading && <p className="text-gray-500">Uploading...</p>}

        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{file.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(file.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDownload(file)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No files yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

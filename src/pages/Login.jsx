import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login({ setUser }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState('session') // 'session', '1h', '24h', 'forever'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const hashPassword = async (password) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const hashedPassword = await hashPassword(password)

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password_hash', hashedPassword)
      .single()

    if (error || !data) {
      setError('Invalid username or password')
      setLoading(false)
      return
    }

    // Store user based on remember option
    const userData = {
      id: data.id,
      username: data.username
    }

    if (remember === 'session') {
      // Until refresh: use sessionStorage
      sessionStorage.setItem('user', JSON.stringify(userData))
      sessionStorage.removeItem('user_expiry')
      localStorage.removeItem('user')
      localStorage.removeItem('user_expiry')
    } else {
      // Persistent: use localStorage with expiry
      let expiryTime = null
      const now = Date.now()

      if (remember === '1h') {
        expiryTime = now + 60 * 60 * 1000
      } else if (remember === '24h') {
        expiryTime = now + 24 * 60 * 60 * 1000
      } else if (remember === 'forever') {
        // 10 years for "forever"
        expiryTime = now + 10 * 365 * 24 * 60 * 60 * 1000
      }

      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('user_expiry', expiryTime.toString())
      sessionStorage.removeItem('user')
    }

    setUser(userData)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Login</h2>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded bg-gray-700 text-white placeholder-gray-400 border-gray-600"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded bg-gray-700 text-white placeholder-gray-400 border-gray-600"
          required
        />
        <select
          value={remember}
          onChange={(e) => setRemember(e.target.value)}
          className="w-full p-2 mb-4 border rounded bg-gray-700 text-white border-gray-600"
        >
          <option value="session">Until refresh (default)</option>
          <option value="1h">1 hour</option>
          <option value="24h">24 hours</option>
          <option value="forever">Forever</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

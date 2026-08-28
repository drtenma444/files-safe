import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { useState, useEffect } from 'react'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage first (for persistent sessions)
    const storedUser = localStorage.getItem('user')
    const storedExpiry = localStorage.getItem('user_expiry')

    if (storedUser && storedExpiry) {
      const expiry = parseInt(storedExpiry, 10)
      if (Date.now() < expiry) {
        setUser(JSON.parse(storedUser))
        setLoading(false)
        return
      } else {
        // Expired, clear local storage
        localStorage.removeItem('user')
        localStorage.removeItem('user_expiry')
      }
    }

    // Check session storage (for session-only)
    const sessionUser = sessionStorage.getItem('user')
    if (sessionUser) {
      setUser(JSON.parse(sessionUser))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  )
}

export default App
//ignore this fully.

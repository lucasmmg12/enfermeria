import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser } from '../lib/utils'
import { trackLogin, trackLogout } from '../lib/hubTracker'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('enf_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Try Supabase enf_usuarios first
    const dbUser = await loginUser(email, password)
    if (dbUser) {
      const userData = { id: dbUser.id, email: dbUser.email, nombre: `${dbUser.nombre} ${dbUser.apellido}`, rol: dbUser.rol }
      setUser(userData)
      localStorage.setItem('enf_user', JSON.stringify(userData))
      // Track in Hub Monitor (non-blocking)
      trackLogin(dbUser.email)
      return { success: true }
    }

    // Fallback for initial setup (before DB is ready)
    if (email === 'admin' && password === '123456') {
      const userData = { id: 'local-admin', email: 'admin', nombre: 'Administrador', rol: 'admin' }
      setUser(userData)
      localStorage.setItem('enf_user', JSON.stringify(userData))
      return { success: true }
    }

    return { success: false, error: 'Credenciales incorrectas' }
  }

  const logout = () => {
    if (user?.email) trackLogout(user.email)
    setUser(null)
    localStorage.removeItem('enf_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

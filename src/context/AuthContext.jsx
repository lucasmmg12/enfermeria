import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loginUser } from '../lib/utils'
import { trackLogin, trackLogout } from '../lib/hubTracker'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to restore session from Supabase Auth first, then fallback to localStorage
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // We have a valid Supabase Auth session, look up enf_usuarios profile
          const { data: profile } = await supabase
            .from('enf_usuarios')
            .select('*')
            .eq('email', session.user.email)
            .eq('activo', true)
            .maybeSingle()

          if (profile) {
            const userData = { id: profile.id, email: profile.email, nombre: `${profile.nombre} ${profile.apellido}`, rol: profile.rol }
            setUser(userData)
            localStorage.setItem('enf_user', JSON.stringify(userData))
            setLoading(false)
            return
          }
        }
      } catch (e) {
        console.warn('[Auth] Session restore error:', e)
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('enf_user')
      if (saved) {
        try { setUser(JSON.parse(saved)) } catch {}
      }
      setLoading(false)
    }

    restoreSession()
  }, [])

  const login = async (email, password) => {
    // Try Supabase Auth + enf_usuarios profile
    const dbUser = await loginUser(email, password)
    if (dbUser) {
      const userData = { id: dbUser.id, email: dbUser.email, nombre: `${dbUser.nombre} ${dbUser.apellido}`, rol: dbUser.rol }
      setUser(userData)
      localStorage.setItem('enf_user', JSON.stringify(userData))
      // Track in Hub Monitor (non-blocking)
      trackLogin(dbUser.email)
      return { success: true }
    }

    return { success: false, error: 'Credenciales incorrectas' }
  }

  const logout = async () => {
    if (user?.email) trackLogout(user.email)
    setUser(null)
    localStorage.removeItem('enf_user')
    // Sign out from Supabase Auth
    try { await supabase.auth.signOut() } catch {}
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

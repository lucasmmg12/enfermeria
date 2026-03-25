import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loginUser } from '../lib/utils'
import { trackLogin, trackLogout } from '../lib/hubTracker'

const AuthContext = createContext(null)

/**
 * Fetches the enf_usuarios profile for a given auth user.
 * Tries by ID first (Hub-aligned), then by email (legacy).
 */
async function fetchEnfProfile(authUser) {
  // Try by auth user ID (aligned by Hub RPCs)
  const { data: profileById } = await supabase
    .from('enf_usuarios')
    .select('*')
    .eq('id', authUser.id)
    .eq('activo', true)
    .maybeSingle()

  if (profileById) return profileById

  // Fallback: try by email
  const { data: profileByEmail } = await supabase
    .from('enf_usuarios')
    .select('*')
    .eq('email', authUser.email)
    .eq('activo', true)
    .maybeSingle()

  if (profileByEmail) return profileByEmail

  // No profile — return minimal data
  const nameParts = (authUser.user_metadata?.full_name || authUser.email.split('@')[0]).split(' ')
  return {
    id: authUser.id,
    email: authUser.email,
    nombre: nameParts[0] || 'Usuario',
    apellido: nameParts.slice(1).join(' ') || '',
    rol: 'enfermero',
  }
}

function buildUserData(profile) {
  return {
    id: profile.id,
    email: profile.email,
    nombre: `${profile.nombre} ${profile.apellido || ''}`.trim(),
    rol: profile.rol,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from Supabase Auth
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const profile = await fetchEnfProfile(session.user)
          setUser(buildUserData(profile))
        }
      } catch (e) {
        console.warn('[Auth] Session restore error:', e)
      }
      setLoading(false)
    }

    restoreSession()

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchEnfProfile(session.user)
          setUser(buildUserData(profile))
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const login = async (email, password) => {
    // loginUser handles signInWithPassword + profile fetch
    const dbUser = await loginUser(email, password)
    if (dbUser) {
      const userData = buildUserData(dbUser)
      setUser(userData)
      // Track in Hub Monitor (non-blocking)
      trackLogin(dbUser.email)
      return { success: true }
    }

    return { success: false, error: 'Credenciales incorrectas' }
  }

  const logout = async () => {
    if (user?.email) trackLogout(user.email)
    setUser(null)
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


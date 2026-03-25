import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Complete todos los campos')
      return
    }
    setLoading(true)
    setError('')
    const result = await login(email.trim(), password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Credenciales incorrectas')
    }
  }

  return (
    <div className="min-h-screen bg-white bg-watermark-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm anim-fade">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logosanatorio.png" alt="SA" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-xl shadow-lg shadow-[#1565a0]/10" />
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 italic">Pase de Guardia</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Unidad de Terapia Intensiva</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-5 md:p-7 shadow-lg space-y-4 md:space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs md:text-sm font-medium text-red-600 anim-fade">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Usuario</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email o usuario" autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••" autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#1565a0] text-white hover:bg-[#12527e]
              disabled:opacity-50 transition-colors shadow-lg shadow-[#1565a0]/20 active:scale-[0.98]">
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</span>
            ) : 'Iniciar Sesión'}
          </button>

          <p className="text-[10px] text-center text-slate-400 pt-2">
            Sanatorio Argentino © 2026
          </p>
        </form>
      </div>
    </div>
  )
}

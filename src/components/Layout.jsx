import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Bell, BarChart3, Users, Settings, LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getCurrentShift, getShiftLabel, getShiftColor, formatDate } from '../lib/utils'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', short: 'Inicio' },
  { path: '/pase', icon: ClipboardList, label: 'Pase de Guardia', short: 'Pase' },
  { path: '/alertas', icon: Bell, label: 'Alertas', short: 'Alertas' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes', short: 'Reportes' },
  { path: '/personal', icon: Users, label: 'Personal', short: 'Equipo' },
]

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const currentShift = getCurrentShift()
  const shiftColors = getShiftColor(currentShift)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white bg-watermark-light">
      {/* === MOBILE HEADER === */}
      <header className="md:hidden relative z-10 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <img src="/logosanatorio.png" alt="SA" className="w-8 h-8 rounded-lg" />
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">UTI</p>
            <p className="text-[10px] text-slate-400">Pase de Guardia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${shiftColors.bg} ${shiftColors.text} ${shiftColors.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftColors.dot} anim-pulse`} />
            {getShiftLabel(currentShift)}
          </div>
          <div className="w-7 h-7 rounded-full bg-[#1565a0] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">{user?.nombre?.charAt(0) || 'A'}</span>
          </div>
        </div>
      </header>

      {/* === DESKTOP TOP NAVBAR === */}
      <nav className="hidden md:flex relative z-10 items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <img src="/logosanatorio.png" alt="SA" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-bold text-slate-800">Inicio</span>
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#1565a0] text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-slate-100">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${shiftColors.bg} ${shiftColors.text} ${shiftColors.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftColors.dot} anim-pulse`} />
            Turno {getShiftLabel(currentShift)}
          </div>
          <span className="text-xs text-slate-400 font-medium hidden lg:inline">{formatDate(new Date())}</span>
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-xs font-semibold text-slate-600">{user?.nombre}</span>
          <div className="w-7 h-7 rounded-full bg-[#1565a0] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">{user?.nombre?.charAt(0) || 'A'}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      {/* === CONTENT === */}
      <main className="relative z-10 px-3 py-3 md:px-6 md:py-4 max-w-7xl mx-auto pb-20 md:pb-4">
        <Outlet />
      </main>

      {/* === MOBILE BOTTOM TAB BAR === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 px-2 pb-safe">
        <div className="flex items-center justify-around py-1.5">
          {navItems.slice(0, 5).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[52px] ${
                  isActive
                    ? 'text-[#1565a0]'
                    : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#1565a0]/10' : ''}`}>
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[9px] font-semibold leading-tight">{item.short}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-slate-400 min-w-[52px]">
            <div className="p-1.5"><LogOut className="w-5 h-5" strokeWidth={1.8} /></div>
            <span className="text-[9px] font-semibold leading-tight">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

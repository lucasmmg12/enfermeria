import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, AlertTriangle, Clock, Search, Plus, LogOut as LogOutIcon } from 'lucide-react'
import { fetchInternacionesActivas, fetchAlertasActivas, getStatusColor, daysSince, getShiftLabel, getCurrentShift } from '../lib/utils'
import IngresoPacienteModal from '../components/IngresoPacienteModal'
import EgresoPacienteModal from '../components/EgresoPacienteModal'

/* === BOX CARD (mobile-first) === */
function BoxCard({ internacion, onClick, onEgreso }) {
  const pac = internacion.hospital_paciente
  const status = getStatusColor(internacion.estado_actual)
  const days = daysSince(internacion.fecha_ingreso)
  const borderColors = { estable: 'border-l-green-500', atencion: 'border-l-amber-500', critico: 'border-l-red-500' }

  return (
    <div className={`bg-white rounded-xl md:rounded-2xl border border-slate-100 border-l-4 ${borderColors[internacion.estado_actual]}
      p-3.5 md:p-5 cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-sm relative`}>
      <div onClick={() => onClick(internacion.numero_box)}>
        <div className="flex items-start justify-between mb-2 md:mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Box {String(internacion.numero_box).padStart(2, '0')}
            </p>
            <h3 className="text-sm md:text-base font-bold text-slate-800 group-hover:text-[#1565a0] transition-colors truncate">
              {pac?.apellido || ''}, {pac?.nombre_corto || ''}
            </h3>
          </div>
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ml-2 mt-1 ${status.dot} ${internacion.estado_actual === 'critico' ? 'anim-pulse' : ''}`} />
        </div>

        <p className="text-xs text-slate-500 mb-2 md:mb-3 leading-relaxed line-clamp-1 md:line-clamp-2">{internacion.diagnostico_ingreso}</p>

        <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
          <span className="px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            DNI: {pac?.dni}
          </span>
          {pac?.edad && (
            <span className="px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
              {pac.edad} años
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-slate-100">
          <span className="text-[10px] md:text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />{days}d
          </span>
          {internacion.medico_tratante && (
            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">Dr. {internacion.medico_tratante}</span>
          )}
        </div>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onEgreso(internacion) }}
        className="absolute top-2 right-2 md:top-3 md:right-3 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center
          text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
        title="Dar egreso">
        <LogOutIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

/* === EMPTY BOX (mobile-first) === */
function EmptyBox({ number, onIngreso }) {
  return (
    <div onClick={() => onIngreso(number)}
      className="bg-white/60 rounded-xl md:rounded-2xl border-2 border-dashed border-slate-200 p-4 md:p-5 flex flex-col items-center justify-center min-h-[140px] md:min-h-[200px]
        cursor-pointer hover:bg-blue-50/50 hover:border-[#1565a0]/30 group transition-all active:scale-[0.98]">
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-100 group-hover:bg-[#1565a0]/10 flex items-center justify-center mb-1.5 md:mb-2 transition-colors">
        <Plus className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-[#1565a0] transition-colors" />
      </div>
      <span className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest group-hover:text-[#1565a0] transition-colors">
        Box {String(number).padStart(2, '0')}
      </span>
      <span className="text-[9px] md:text-[10px] text-slate-300 mt-0.5 group-hover:text-[#1565a0]/60 transition-colors">
        Ingresar paciente
      </span>
    </div>
  )
}

/* === DASHBOARD === */
export default function Dashboard() {
  const [internaciones, setInternaciones] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ingresoBox, setIngresoBox] = useState(null)
  const [egresoData, setEgresoData] = useState(null)
  const navigate = useNavigate()

  const loadData = async () => {
    setLoading(true)
    const [ints, alts] = await Promise.all([fetchInternacionesActivas(), fetchAlertasActivas()])
    setInternaciones(ints)
    setAlertas(alts)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const total = internaciones.length
  const criticos = internaciones.filter(i => i.estado_actual === 'critico').length
  const atencion = internaciones.filter(i => i.estado_actual === 'atencion').length
  const libres = 16 - total
  const boxMap = {}
  internaciones.forEach(i => { boxMap[i.numero_box] = i })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <img src="/logosanatorio.png" alt="" className="w-14 h-14 mx-auto mb-3 animate-pulse rounded-xl" />
          <p className="text-sm text-slate-400">Cargando UTI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <IngresoPacienteModal open={!!ingresoBox} onClose={() => setIngresoBox(null)} boxNumber={ingresoBox} onSuccess={() => loadData()} />
      <EgresoPacienteModal open={!!egresoData} onClose={() => setEgresoData(null)} internacion={egresoData}
        pacienteNombre={egresoData ? `${egresoData.hospital_paciente?.apellido || ''}, ${egresoData.hospital_paciente?.nombre_corto || ''}` : ''}
        onSuccess={() => { setEgresoData(null); loadData() }} />

      {/* Hero - compact on mobile */}
      <div className="text-center pt-1 md:pt-4 anim-fade">
        <h1 className="text-xl md:text-3xl font-bold text-slate-800 italic">Pase de Guardia</h1>
        <p className="text-xs md:text-sm text-slate-400 mt-0.5">Turno {getShiftLabel(getCurrentShift())} · UTI</p>
      </div>

      {/* Alert */}
      {criticos > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 flex items-center gap-2 text-white shadow-lg shadow-orange-500/20 anim-fade">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs md:text-sm font-semibold">⚡ {criticos} paciente{criticos > 1 ? 's' : ''} en estado crítico</p>
        </div>
      )}

      {/* KPIs - 2x2 grid on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: 'Activos', value: total, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-[#1565a0]' },
          { label: 'Críticos', value: criticos, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
          { label: 'Alertas', value: alertas.length, icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
          { label: 'Libres', value: libres, icon: Plus, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl md:rounded-2xl border border-slate-100 p-3 md:p-5 flex items-center gap-3 md:gap-4 shadow-sm anim-fade" style={{ animationDelay: `${i * 60}ms` }}>
            <div className={`w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl ${kpi.iconBg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon className={`w-4 h-4 md:w-6 md:h-6 ${kpi.iconColor}`} />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar paciente, DNI, box..."
          className="w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-slate-100 bg-white text-sm text-slate-700
            focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0]
            transition-all placeholder:text-slate-300 shadow-sm" />
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img src="/logosanatorio.png" alt="" className="w-5 h-5 md:w-6 md:h-6 rounded" />
          <h2 className="text-base md:text-lg font-bold text-slate-800">Boxes</h2>
          <span className="text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full bg-blue-50 text-[#1565a0] font-semibold border border-blue-100">
            {total}/16
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Crítico</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atención</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Estable</span>
        </div>
      </div>

      {/* Grid - 2 cols mobile, scales up */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
        {Array.from({ length: 16 }, (_, i) => {
          const n = i + 1
          const inter = boxMap[n]
          if (search && inter) {
            const pac = inter.hospital_paciente
            const term = search.toLowerCase()
            if (!`${pac?.apellido} ${pac?.nombre_corto} ${inter.diagnostico_ingreso} ${pac?.dni} box ${n}`.toLowerCase().includes(term)) return null
          }
          return inter
            ? <BoxCard key={n} internacion={inter} onClick={() => navigate(`/paciente/${n}`)} onEgreso={(data) => setEgresoData(data)} />
            : <EmptyBox key={n} number={n} onIngreso={(num) => setIngresoBox(num)} />
        })}
      </div>

      {/* Footer - hidden on mobile */}
      <div className="hidden md:flex text-xs text-slate-400 justify-between items-center pt-4 border-t border-slate-100">
        <span>📋 {total} pacientes activos · {libres} boxes libres</span>
        <div className="flex items-center gap-2">
          <img src="/logosanatorio.png" alt="" className="w-4 h-4 rounded opacity-40" />
          <span>Sanatorio Argentino © 2026</span>
        </div>
      </div>
    </div>
  )
}

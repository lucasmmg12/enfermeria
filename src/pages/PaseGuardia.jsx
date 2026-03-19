import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, Clock, CheckCircle2, ArrowRight, Users, Pen, AlertCircle, Mic,
} from 'lucide-react'
import {
  fetchInternacionesActivas, fetchRegistrosPase, fetchOrCreatePase, fetchEnfUsuarios,
  getCurrentShift, getShiftLabel, getShiftColor, getStatusColor, formatDate, daysSince, calcAge,
} from '../lib/utils'
import { useAuth } from '../context/AuthContext'

export default function PaseGuardia() {
  const [internaciones, setInternaciones] = useState([])
  const [registros, setRegistros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [pase, setPase] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  const currentShift = getCurrentShift()
  const shiftColors = getShiftColor(currentShift)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ints, users, currentPase] = await Promise.all([
        fetchInternacionesActivas(),
        fetchEnfUsuarios(),
        fetchOrCreatePase(),
      ])
      setInternaciones(ints)
      setUsuarios(users)
      setPase(currentPase)

      if (currentPase) {
        const regs = await fetchRegistrosPase(currentPase.id)
        setRegistros(regs)
      }
      setLoading(false)
    }
    load()
  }, [])

  const documentedIds = new Set(registros.map(r => r.internacion_id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <img src="/logosanatorio.png" alt="" className="w-14 h-14 animate-pulse rounded-xl" />
      </div>
    )
  }

  const documentedCount = internaciones.filter(i => documentedIds.has(i.id)).length
  const pendingCount = internaciones.length - documentedCount
  const progress = internaciones.length > 0 ? Math.round((documentedCount / internaciones.length) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 anim-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 italic">Pase de Guardia</h2>
          <p className="text-sm text-slate-400 mt-0.5">{formatDate(new Date())} · Sanatorio Argentino — UTI</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${shiftColors.bg} ${shiftColors.text} ${shiftColors.border}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${shiftColors.dot} anim-pulse`} />
          Turno {getShiftLabel(currentShift)}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1565a0] flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">Progreso del Pase</p>
              <p className="text-xs text-slate-400">{documentedCount} de {internaciones.length} pacientes documentados</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-[#1565a0]">{progress}%</span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#1565a0] to-[#3b82f6] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center gap-6 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> {documentedCount} completados
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-amber-500" /> {pendingCount} pendientes
          </span>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pacientes — Estado de Documentación</h3>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Documentado</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pendiente</span>
          </div>
        </div>

        {internaciones.length === 0 ? (
          <div className="p-10 text-center">
            <img src="/logosanatorio.png" alt="" className="w-10 h-10 mx-auto mb-3 rounded opacity-20" />
            <p className="text-sm text-slate-400">No hay pacientes internados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {internaciones.map((inter, index) => {
              const isDocumented = documentedIds.has(inter.id)
              const status = getStatusColor(inter.estado_actual)
              const pac = inter.hospital_paciente
              const days = daysSince(inter.fecha_ingreso)
              const edad = calcAge(pac?.fecha_nacimiento)

              return (
                <div key={inter.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/30 transition-colors cursor-pointer group anim-fade"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => navigate(`/paciente/${inter.numero_box}`)}>
                  <div className="flex items-center gap-4">
                    {isDocumented ? (
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                        <Pen className="w-4 h-4 text-amber-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Box {String(inter.numero_box).padStart(2, '0')}</span>
                        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-[#1565a0] transition-colors">
                        {pac?.apellido || ''}, {pac?.nombre_corto || ''}
                      </p>
                      <p className="text-xs text-slate-400">
                        {inter.diagnostico_ingreso} · {days}d · {edad ? `${edad} años` : ''} · DNI: {pac?.dni}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isDocumented ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {isDocumented ? 'Completado' : 'Pendiente'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#1565a0] transition-colors" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Team */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1565a0]" /> Equipo de Turno {getShiftLabel(currentShift)}
        </h3>
        <div className="flex flex-wrap gap-2">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-full bg-[#1565a0] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{u.nombre[0]}{u.apellido[0]}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">{u.apellido}, {u.nombre}</p>
                <p className="text-[10px] text-slate-400">{u.rol}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

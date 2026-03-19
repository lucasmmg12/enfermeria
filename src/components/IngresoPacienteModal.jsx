import { useState, useEffect, useRef } from 'react'
import { Search, X, UserPlus, Loader2 } from 'lucide-react'
import { searchHospitalPacientes, ingresarPaciente } from '../lib/utils'

export default function IngresoPacienteModal({ open, onClose, boxNumber, onSuccess }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [diagnostico, setDiagnostico] = useState('')
  const [medico, setMedico] = useState('')
  const [estado, setEstado] = useState('estable')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
    if (!open) {
      setQuery(''); setResults([]); setSelected(null); setDiagnostico(''); setMedico(''); setEstado('estable')
    }
  }, [open])

  const handleSearch = (value) => {
    setQuery(value)
    setSelected(null)
    clearTimeout(debounceRef.current)
    if (value.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const data = await searchHospitalPacientes(value)
      setResults(data)
      setSearching(false)
    }, 300)
  }

  const handleSelect = (pac) => {
    setSelected(pac)
    setQuery(`${pac.apellido}, ${pac.nombre_corto}`)
    setResults([])
  }

  const handleSubmit = async () => {
    if (!selected || !diagnostico.trim()) return
    setSaving(true)
    const result = await ingresarPaciente({
      hospital_paciente_id: selected.id_paciente,
      numero_box: boxNumber,
      diagnostico_ingreso: diagnostico.trim(),
      medico_tratante: medico.trim() || null,
      estado_actual: estado,
    })
    setSaving(false)
    if (result) {
      onSuccess?.(result)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-0 max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[#1565a0]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ingresar Paciente</h3>
              <p className="text-xs text-slate-400">Box {String(boxNumber).padStart(2, '0')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Buscar Paciente (DNI o Nombre)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text" value={query} onChange={e => handleSearch(e.target.value)}
                placeholder="Ej: 12345678 o García"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                {results.map(pac => (
                  <button key={pac.id_paciente} onClick={() => handleSelect(pac)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors">
                    <p className="text-sm font-semibold text-slate-800">{pac.apellido}, {pac.nombre_corto}</p>
                    <p className="text-xs text-slate-400">DNI: {pac.dni} · {pac.centro || 'Sin centro'} · {pac.edad ? `${pac.edad} años` : 'S/E'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected patient info */}
          {selected && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 anim-fade">
              <p className="text-xs font-bold text-[#1565a0] uppercase tracking-wider mb-1">Paciente Seleccionado</p>
              <p className="text-base font-bold text-slate-800">{selected.apellido}, {selected.nombre_corto}</p>
              <p className="text-xs text-slate-500">
                DNI: {selected.dni} · Edad: {selected.edad || 'N/D'} años · Centro: {selected.centro || 'N/D'}
              </p>
            </div>
          )}

          {/* Diagnosis */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Diagnóstico de Ingreso a UTI *
            </label>
            <input type="text" value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
              placeholder="Ej: IAM, Neumonía severa, Post-quirúrgico..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50
                focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all" />
          </div>

          {/* Medico */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Médico Tratante
            </label>
            <input type="text" value={medico} onChange={e => setMedico(e.target.value)}
              placeholder="Nombre del médico"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50
                focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all" />
          </div>

          {/* Estado */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Estado Inicial
            </label>
            <div className="flex gap-2">
              {[
                { value: 'estable', label: 'Estable', color: 'bg-green-50 text-green-700 border-green-200' },
                { value: 'atencion', label: 'Atención', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { value: 'critico', label: 'Crítico', color: 'bg-red-50 text-red-700 border-red-200' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setEstado(opt.value)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    estado === opt.value ? opt.color + ' shadow-sm' : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!selected || !diagnostico.trim() || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1565a0] text-white hover:bg-[#12527e]
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-[#1565a0]/20">
            <UserPlus className="w-4 h-4" />
            {saving ? 'Ingresando...' : 'Ingresar Paciente'}
          </button>
        </div>
      </div>
    </div>
  )
}

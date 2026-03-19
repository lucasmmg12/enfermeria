import { useState } from 'react'
import { LogOut, X, AlertTriangle } from 'lucide-react'
import { egresarPaciente } from '../lib/utils'

const MOTIVOS = [
  { value: 'alta_medica', label: 'Alta Médica', icon: '✅', desc: 'El paciente recibió alta del médico tratante' },
  { value: 'derivacion_piso', label: 'Derivación a Piso', icon: '🏥', desc: 'Transferencia a sala de internación general' },
  { value: 'obito', label: 'Óbito', icon: '🕊️', desc: 'Fallecimiento del paciente' },
  { value: 'traslado_externo', label: 'Traslado Externo', icon: '🚑', desc: 'Derivación a otro centro de salud' },
]

export default function EgresoPacienteModal({ open, onClose, internacion, pacienteNombre, onSuccess }) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!open) return null

  const handleConfirm = async () => {
    if (!confirming) { setConfirming(true); return }
    setSaving(true)
    const result = await egresarPaciente(internacion.id, motivo)
    setSaving(false)
    if (result) {
      onSuccess?.(result)
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-0 max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Egreso de Paciente</h3>
              <p className="text-xs text-slate-400">{pacienteNombre} · Box {internacion?.numero_box}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Motivo de Egreso *
          </label>
          {MOTIVOS.map(m => (
            <button key={m.value} onClick={() => { setMotivo(m.value); setConfirming(false) }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                motivo === m.value
                  ? 'bg-blue-50 border-[#1565a0] shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <p className="text-sm font-semibold text-slate-800">{m.icon} {m.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
            </button>
          ))}

          {confirming && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 anim-fade">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">¿Confirmar egreso?</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {pacienteNombre} será dado de baja del Box {internacion?.numero_box}. Esta acción quedará registrada.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={!motivo || saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md ${
              confirming
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-[#1565a0] hover:bg-[#12527e] shadow-[#1565a0]/20'
            }`}>
            {saving ? 'Procesando...' : confirming ? '⚠ Confirmar Egreso' : 'Dar Egreso'}
          </button>
        </div>
      </div>
    </div>
  )
}

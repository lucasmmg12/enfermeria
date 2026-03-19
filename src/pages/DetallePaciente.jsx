import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Brain, HeartPulse, Droplets, Wind, Moon,
  Utensils, Eye, Syringe, Activity, AlertTriangle, Clock,
  FileText, Thermometer, CheckCircle2, Users, Sparkles, Mic,
  Square, Loader2,
} from 'lucide-react'
import {
  fetchInternacionByBox, fetchLatestRegistro, fetchOrCreatePase,
  upsertRegistro, getCurrentShift, getShiftLabel, getStatusColor,
  daysSince, formatDate, generateAISummary,
} from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import Modal, { Toast } from '../components/Modal'
import AudioRecorder from '../components/AudioRecorder'

// ============ FORM COMPONENTS ============

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  )
}

function RadioGroup({ label, icon: Icon, options, value, onChange }) {
  return (
    <div className="space-y-2.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon className="w-4 h-4 text-[#1565a0]" />}
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
              value === opt.value
                ? 'bg-[#1565a0] text-white border-[#1565a0] shadow-md shadow-[#1565a0]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1565a0]/40 hover:text-[#1565a0]'
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, icon: Icon, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {Icon && <Icon className="w-4 h-4 text-[#1565a0]" />}
        {label}
      </label>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-[#1565a0]' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

function NumberInput({ label, icon: Icon, value, onChange, unit, warning }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon className="w-4 h-4 text-[#1565a0]" />}
        {label}
        {warning && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⚠ {warning}</span>}
      </label>
      <div className="flex items-center gap-2">
        <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50
            focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all" />
        {unit && <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  )
}

// ============ MAIN ============

export default function DetallePaciente() {
  const { boxNumber } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [internacion, setInternacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const [form, setForm] = useState({
    estado_neurologico: 'OTE', signos_vitales_estado: 'Estable',
    hta: false, hipotension: false, bradicardia: false, taquicardia: false, febril: false,
    hgt_valor: null, oxigenoterapia: 'AA', fio2: 21, sab: false,
    diuresis_tipo: 'Espontanea', diuresis_cantidad: '+',
    nutricion: 'Oral', via_central_dias: 0, via_periferica_dias: 0,
    pupilas: 'ISO', escaras: false, observaciones: '',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const inter = await fetchInternacionByBox(Number(boxNumber))
      setInternacion(inter)
      if (inter) {
        const latest = await fetchLatestRegistro(inter.id)
        if (latest) {
          setForm(prev => ({
            ...prev,
            estado_neurologico: latest.estado_neurologico || 'OTE',
            signos_vitales_estado: latest.signos_vitales_estado || 'Estable',
            hta: latest.hta || false, hipotension: latest.hipotension || false,
            bradicardia: latest.bradicardia || false, taquicardia: latest.taquicardia || false,
            febril: latest.febril || false, hgt_valor: latest.hgt_valor,
            oxigenoterapia: latest.oxigenoterapia || 'AA', fio2: latest.fio2 || 21,
            sab: latest.sab || false, diuresis_tipo: latest.diuresis_tipo || 'Espontanea',
            diuresis_cantidad: latest.diuresis_cantidad || '+',
            nutricion: latest.nutricion || 'Oral',
            via_central_dias: latest.via_central_dias || 0,
            via_periferica_dias: latest.via_periferica_dias || 0,
            pupilas: latest.pupilas || 'ISO', escaras: latest.escaras || false,
            observaciones: latest.observaciones || '',
          }))
        }
      }
      setLoading(false)
    }
    load()
  }, [boxNumber])

  const u = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleGenerateAI = async () => {
    if (!internacion) return
    setLoadingAI(true)
    const summary = await generateAISummary(internacion.id)
    setAiSummary(summary)
    setLoadingAI(false)
  }

  const handleSave = async () => {
    if (!internacion) return
    setSaving(true)
    const pase = await fetchOrCreatePase()
    const pac = internacion.hospital_paciente
    const edad = pac?.edad

    const result = await upsertRegistro({
      pase_id: pase?.id || null,
      internacion_id: internacion.id,
      paciente_nombre: `${pac?.apellido || ''}, ${pac?.nombre_corto || ''}`,
      paciente_edad: edad,
      paciente_box: internacion.numero_box,
      ...form,
      resumen_ia: aiSummary,
      registrado_por: user?.id !== 'local-admin' ? user?.id : null,
    })
    setSaving(false)
    if (result) {
      setToast({ message: 'Registro guardado exitosamente', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } else {
      setModal({ title: 'Error al Guardar', message: 'No se pudo guardar. Verifique la conexión.', type: 'error' })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <img src="/logosanatorio.png" alt="" className="w-14 h-14 animate-pulse rounded-xl" />
    </div>
  )

  if (!internacion) return (
    <div className="text-center py-20">
      <img src="/logosanatorio.png" alt="" className="w-14 h-14 mx-auto mb-3 rounded-xl opacity-30" />
      <p className="text-lg font-semibold text-slate-700">Box {boxNumber} vacío</p>
      <button onClick={() => navigate('/')} className="mt-4 px-5 py-2.5 bg-[#1565a0] text-white rounded-xl text-sm font-semibold hover:bg-[#12527e] transition-colors">
        ← Volver al Dashboard
      </button>
    </div>
  )

  const pac = internacion.hospital_paciente
  const status = getStatusColor(internacion.estado_actual)
  const edad = pac?.edad

  return (
    <div className="max-w-5xl mx-auto space-y-5 anim-fade">
      {modal && <Modal open={!!modal} onClose={() => setModal(null)} {...modal} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 hover:text-[#1565a0] transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <span>›</span><span>Box {boxNumber}</span><span>›</span>
        <span className="font-semibold text-slate-700">{pac?.apellido}, {pac?.nombre_corto}</span>
      </nav>

      {/* Patient Header */}
      <div className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${status.border} p-5 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#1565a0] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[#1565a0]/20">
              {internacion.numero_box}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{pac?.apellido}, {pac?.nombre_corto}</h2>
              <p className="text-sm text-slate-500">{internacion.diagnostico_ingreso}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                <span>DNI: {pac?.dni}</span>
                {edad && <span>{edad} años</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {daysSince(internacion.fecha_ingreso)}d</span>
                {internacion.medico_tratante && <span>Dr. {internacion.medico_tratante}</span>}
              </div>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-xl text-sm font-bold ${status.bg} ${status.text}`}>{status.label}</span>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Resumen IA del Paciente
          </h3>
          <button onClick={handleGenerateAI} disabled={loadingAI}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all shadow-sm">
            {loadingAI ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</> : <><Sparkles className="w-3.5 h-3.5" /> Generar Resumen</>}
          </button>
        </div>
        {aiSummary ? (
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed anim-fade">
            {aiSummary}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Presione "Generar Resumen" para obtener un resumen IA de los turnos anteriores.</p>
        )}
      </div>

      {/* Audio Recorder */}
      <AudioRecorder internacionId={internacion.id} />

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Section title="Evaluación Clínica">
            <RadioGroup label="Estado Neurológico" icon={Brain}
              options={[{ value: 'OTE', label: 'OTE — Orientado' }, { value: 'DOTE', label: 'DOTE — Desorientado' }, { value: 'CM', label: 'CM — Contención' }]}
              value={form.estado_neurologico} onChange={v => u('estado_neurologico', v)} />
            <RadioGroup label="Signos Vitales" icon={HeartPulse}
              options={[{ value: 'Estable', label: 'Estable' }, { value: 'HTA', label: 'HTA' }, { value: 'Hipotenso', label: 'Hipotensión' }]}
              value={form.signos_vitales_estado} onChange={v => u('signos_vitales_estado', v)} />
            <div className="grid grid-cols-2 gap-x-4">
              <Toggle label="Bradicardia" icon={Activity} checked={form.bradicardia} onChange={v => u('bradicardia', v)} />
              <Toggle label="Taquicardia" icon={Activity} checked={form.taquicardia} onChange={v => u('taquicardia', v)} />
              <Toggle label="Febril" icon={Thermometer} checked={form.febril} onChange={v => u('febril', v)} />
              <Toggle label="HTA" icon={HeartPulse} checked={form.hta} onChange={v => u('hta', v)} />
            </div>
            <NumberInput label="Hemoglucotest (HGT)" icon={Droplets} value={form.hgt_valor} onChange={v => u('hgt_valor', v)} unit="mg/dL"
              warning={form.hgt_valor && (form.hgt_valor < 70 || form.hgt_valor > 180) ? 'Fuera de rango' : null} />
          </Section>
          <Section title="Soporte Respiratorio">
            <RadioGroup label="Oxigenoterapia" icon={Wind}
              options={[{ value: 'AA', label: 'AA — Ambiente' }, { value: 'CN', label: 'CN — Cánula' }, { value: 'Mascarilla', label: 'Mascarilla' }, { value: 'ARM', label: 'ARM — Mecánica' }]}
              value={form.oxigenoterapia} onChange={v => u('oxigenoterapia', v)} />
            {(form.oxigenoterapia === 'ARM' || form.oxigenoterapia === 'Mascarilla') && (
              <NumberInput label="FIO2" icon={Wind} value={form.fio2} onChange={v => u('fio2', v)} unit="%" />
            )}
            <Toggle label="Sedación / Analgesia / Bloqueante (SAB)" icon={Moon} checked={form.sab} onChange={v => u('sab', v)} />
          </Section>
        </div>
        <div className="space-y-5">
          <Section title="Eliminación y Nutrición">
            <RadioGroup label="Diuresis" icon={Droplets}
              options={[{ value: 'Espontanea', label: 'Espontánea' }, { value: 'Sonda', label: 'Sonda' }, { value: 'Horaria', label: 'Horaria' }]}
              value={form.diuresis_tipo} onChange={v => u('diuresis_tipo', v)} />
            <RadioGroup label="Cantidad"
              options={[{ value: '+', label: '+' }, { value: '++', label: '++' }, { value: '(+)', label: '(+)' }, { value: '(-)', label: '(-)' }]}
              value={form.diuresis_cantidad} onChange={v => u('diuresis_cantidad', v)} />
            <RadioGroup label="Nutrición" icon={Utensils}
              options={[{ value: 'Oral', label: 'Oral' }, { value: 'NE', label: 'NE — Enteral' }, { value: 'NP', label: 'NP — Parenteral' }, { value: 'NVO', label: 'NVO — Ayuno' }]}
              value={form.nutricion} onChange={v => u('nutricion', v)} />
          </Section>
          <Section title="Dispositivos y Evaluación">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Vía Central" icon={Syringe} value={form.via_central_dias} onChange={v => u('via_central_dias', v)} unit="días"
                warning={form.via_central_dias >= 14 ? '¡Cambio!' : form.via_central_dias >= 10 ? 'Próximo' : null} />
              <NumberInput label="Vía Periférica" icon={Syringe} value={form.via_periferica_dias} onChange={v => u('via_periferica_dias', v)} unit="días"
                warning={form.via_periferica_dias >= 4 ? '¡Cambio!' : form.via_periferica_dias >= 3 ? 'Próximo' : null} />
            </div>
            <RadioGroup label="Pupilas" icon={Eye}
              options={[{ value: 'ISO', label: 'ISO — Isocóricas' }, { value: 'MIO', label: 'MIO — Mióticas' }, { value: 'MED', label: 'MED — Midriáticas' }, { value: 'ANI', label: 'ANI — Anisocóricas' }]}
              value={form.pupilas} onChange={v => u('pupilas', v)} />
            <Toggle label="Presencia de Escaras" icon={AlertTriangle} checked={form.escaras} onChange={v => u('escaras', v)} />
          </Section>
          <Section title="Observaciones">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="w-4 h-4 text-[#1565a0]" /> Observaciones del Turno
              </label>
              <textarea value={form.observaciones || ''} onChange={e => u('observaciones', e.target.value)} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 resize-none
                  focus:outline-none focus:ring-2 focus:ring-[#1565a0]/15 focus:border-[#1565a0] focus:bg-white transition-all"
                placeholder="Escriba observaciones aquí..." />
            </div>
          </Section>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center justify-between sticky bottom-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <img src="/logosanatorio.png" alt="" className="w-5 h-5 rounded opacity-50" />
          Turno {getShiftLabel(getCurrentShift())} · {formatDate(new Date())}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#1565a0] text-white hover:bg-[#12527e] disabled:opacity-50 transition-colors shadow-md shadow-[#1565a0]/20">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

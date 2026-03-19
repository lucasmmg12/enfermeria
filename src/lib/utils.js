import { supabase } from './supabase'

// ============ TIME & FORMATTING ============

export function getCurrentShift() {
  const hour = new Date().getHours()
  if (hour >= 7 && hour < 14) return 'Manana'
  if (hour >= 14 && hour < 21) return 'Tarde'
  return 'Noche'
}

export function getShiftLabel(shift) {
  const labels = { Manana: 'Mañana', Tarde: 'Tarde', Noche: 'Noche' }
  return labels[shift] || shift
}

export function getShiftColor(shift) {
  const colors = {
    Manana: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    Tarde: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    Noche: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  }
  return colors[shift] || colors.Manana
}

export function getStatusColor(status) {
  const colors = {
    estable: { bg: 'bg-green-50', border: 'border-l-green-500', text: 'text-green-700', dot: 'bg-green-500', label: 'Estable' },
    atencion: { bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Atención' },
    critico: { bg: 'bg-red-50', border: 'border-l-red-500', text: 'text-red-700', dot: 'bg-red-500', label: 'Crítico' },
  }
  return colors[status] || colors.estable
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24)))
}

export function calcAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ============ HELPER: Enrich internaciones with hospital_pacientes data ============

async function enrichWithPacienteData(internaciones) {
  if (!internaciones || internaciones.length === 0) return []

  const ids = [...new Set(internaciones.map(i => i.hospital_paciente_id))]

  // hospital_pacientes uses id_paciente, nombre (full name), dni, edad, sexo, email, centro
  const { data: pacientes, error } = await supabase
    .from('hospital_pacientes')
    .select('id_paciente, nombre, dni, edad, sexo, centro')
    .in('id_paciente', ids)

  if (error) {
    console.error('Error fetching hospital_pacientes:', error)
    return internaciones.map(i => ({ ...i, hospital_paciente: null }))
  }

  // Map by id_paciente
  const pacMap = {}
  ;(pacientes || []).forEach(p => {
    // Parse nombre: "- GARCIA, MAURICIO" → apellido + nombre
    const parsed = parsePacienteNombre(p.nombre)
    pacMap[p.id_paciente] = { ...p, ...parsed }
  })

  return internaciones.map(i => ({
    ...i,
    hospital_paciente: pacMap[i.hospital_paciente_id] || null,
  }))
}

// Parse "- GARCIA, MAURICIO" into { apellido: "GARCIA", nombre_corto: "MAURICIO" }
export function parsePacienteNombre(rawName) {
  if (!rawName) return { apellido: '', nombre_corto: '', nombre_display: '' }
  // Remove leading "- " if present
  let clean = rawName.replace(/^-\s*/, '').trim()
  const parts = clean.split(',')
  if (parts.length >= 2) {
    return {
      apellido: parts[0].trim(),
      nombre_corto: parts.slice(1).join(',').trim(),
      nombre_display: clean,
    }
  }
  return { apellido: clean, nombre_corto: '', nombre_display: clean }
}

// ============ ENF_USUARIOS ============

export async function loginUser(email, password) {
  const { data, error } = await supabase
    .from('enf_usuarios')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password)
    .eq('activo', true)
    .single()
  if (error || !data) return null
  return data
}

export async function fetchEnfUsuarios() {
  const { data } = await supabase.from('enf_usuarios').select('*').eq('activo', true).order('apellido')
  return data || []
}

// ============ HOSPITAL_PACIENTES (READ-ONLY) ============

export async function searchHospitalPacientes(query) {
  if (!query || query.length < 2) return []
  const isNumber = /^\d+$/.test(query)
  // Real columns: id_paciente, nombre (full name), dni, edad, sexo, centro
  let q = supabase.from('hospital_pacientes').select('id_paciente, nombre, dni, edad, sexo, centro').limit(15)
  if (isNumber) {
    q = q.ilike('dni', `%${query}%`)
  } else {
    // nombre contains full name like "- GARCIA, MAURICIO"
    q = q.ilike('nombre', `%${query}%`)
  }
  const { data, error } = await q
  if (error) { console.error('Error buscando pacientes:', error); return [] }
  // Parse names
  return (data || []).map(p => ({
    ...p,
    ...parsePacienteNombre(p.nombre),
  }))
}

// ============ ENF_INTERNACIONES ============

export async function fetchInternacionesActivas() {
  const { data, error } = await supabase
    .from('enf_internaciones')
    .select('*')
    .eq('activo', true)
    .order('numero_box')
  if (error) { console.error('Error:', error); return [] }
  return enrichWithPacienteData(data || [])
}

export async function fetchInternacionByBox(boxNumber) {
  const { data, error } = await supabase
    .from('enf_internaciones')
    .select('*')
    .eq('numero_box', boxNumber)
    .eq('activo', true)
    .maybeSingle()
  if (error) { console.error('Error:', error); return null }
  if (!data) return null

  // Enrich with paciente data
  const enriched = await enrichWithPacienteData([data])
  return enriched[0] || null
}

export async function ingresarPaciente({ hospital_paciente_id, numero_box, diagnostico_ingreso, medico_tratante, estado_actual }) {
  const { data, error } = await supabase
    .from('enf_internaciones')
    .insert({ hospital_paciente_id, numero_box, diagnostico_ingreso, medico_tratante, estado_actual: estado_actual || 'estable' })
    .select()
    .single()
  if (error) { console.error('Error ingresando paciente:', error); return null }
  return data
}

export async function egresarPaciente(internacionId, motivo_egreso) {
  const { data, error } = await supabase
    .from('enf_internaciones')
    .update({ activo: false, fecha_egreso: new Date().toISOString().split('T')[0], motivo_egreso })
    .eq('id', internacionId)
    .select()
    .single()
  if (error) { console.error('Error egresando paciente:', error); return null }
  return data
}

export async function updateEstadoPaciente(internacionId, estado_actual) {
  const { data, error } = await supabase
    .from('enf_internaciones')
    .update({ estado_actual, updated_at: new Date().toISOString() })
    .eq('id', internacionId)
    .select()
    .single()
  if (error) { console.error('Error:', error); return null }
  return data
}

export async function fetchHistorialBox(boxNumber) {
  const { data, error } = await supabase
    .from('enf_internaciones')
    .select('*')
    .eq('numero_box', boxNumber)
    .order('fecha_ingreso', { ascending: false })
    .limit(20)
  if (error) { console.error('Error:', error); return [] }
  return enrichWithPacienteData(data || [])
}

// ============ ENF_PASES ============

export async function fetchOrCreatePase() {
  const fecha = new Date().toISOString().split('T')[0]
  const turno = getCurrentShift()

  const { data: existing } = await supabase
    .from('enf_pases')
    .select('*')
    .eq('fecha', fecha)
    .eq('turno', turno)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('enf_pases')
    .insert({ fecha, turno })
    .select()
    .single()

  if (error) { console.error('Error creando pase:', error); return null }
  return data
}

export async function updatePase(paseId, updates) {
  const { data, error } = await supabase
    .from('enf_pases')
    .update(updates)
    .eq('id', paseId)
    .select()
    .single()
  if (error) { console.error('Error:', error); return null }
  return data
}

// ============ ENF_REGISTROS ============

export async function fetchRegistrosPase(paseId) {
  const { data, error } = await supabase
    .from('enf_registros')
    .select('*')
    .eq('pase_id', paseId)
    .order('paciente_box')
  if (error) { console.error('Error:', error); return [] }
  return data || []
}

export async function fetchLatestRegistro(internacionId) {
  const { data, error } = await supabase
    .from('enf_registros')
    .select('*')
    .eq('internacion_id', internacionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) { console.error('Error:', error); return null }
  return data
}

export async function upsertRegistro(registro) {
  const { data, error } = await supabase
    .from('enf_registros')
    .upsert(registro, { onConflict: 'id' })
    .select()
  if (error) { console.error('Error guardando registro:', error); return null }
  return data?.[0]
}

// ============ ENF_ALERTAS ============

export async function fetchAlertasActivas() {
  const { data, error } = await supabase
    .from('enf_alertas')
    .select('*')
    .eq('activa', true)
    .order('created_at', { ascending: false })
  if (error) { console.error('Error alertas:', error); return [] }
  return data || []
}

// ============ AI SUMMARY ============

export async function generateAISummary(internacionId) {
  const { data: registros } = await supabase
    .from('enf_registros')
    .select('*')
    .eq('internacion_id', internacionId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!registros || registros.length === 0) return 'Sin registros previos para resumir.'

  const context = registros.map((r, i) => {
    return `Turno ${i + 1}: Neurológico: ${r.estado_neurologico}, SV: ${r.signos_vitales_estado}, ` +
      `O2: ${r.oxigenoterapia} FIO2:${r.fio2}%, Diuresis: ${r.diuresis_tipo} ${r.diuresis_cantidad}, ` +
      `Nutrición: ${r.nutricion}, HGT: ${r.hgt_valor || 'N/R'}, ` +
      `${r.febril ? 'FEBRIL' : ''} ${r.bradicardia ? 'BRADI' : ''} ${r.taquicardia ? 'TAQUI' : ''} ` +
      `Obs: ${r.observaciones || 'Sin obs'}`.trim()
  }).join('\n')

  try {
    const { data, error } = await supabase.functions.invoke('enf-ai-summary', {
      body: { context, type: 'summary' }
    })
    if (error) throw error
    return data?.summary || 'No se pudo generar resumen.'
  } catch (err) {
    console.error('Error AI summary:', err)
    return 'Error al generar resumen con IA. Los datos están disponibles manualmente.'
  }
}

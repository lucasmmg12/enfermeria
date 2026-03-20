/**
 * Hub Session Tracker — Enfermería
 * Usa RPC hub_log_external_event porque Enfermería no usa Supabase Auth
 */
import { supabase } from './supabase'

const ENFERMERIA_SISTEMA_ID = '50945c9d-6a01-41dd-9d5f-d3ff55c99d20'

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    return (await res.json()).ip || null
  } catch { return null }
}

function getGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  })
}

export async function trackLogin(userEmail) {
  try {
    const [ip, geo] = await Promise.all([getPublicIP(), getGeo()])
    await supabase.rpc('hub_log_external_event', {
      p_user_identifier: userEmail,
      p_evento: 'login',
      p_sistema_id: ENFERMERIA_SISTEMA_ID,
      p_ip: ip,
      p_user_agent: navigator.userAgent,
      p_latitud: geo?.lat || null,
      p_longitud: geo?.lng || null,
      p_metadata: { source: 'enfermeria' },
    })
  } catch (e) { console.warn('[HubTracker]', e) }
}

export async function trackLogout(userEmail) {
  try {
    await supabase.rpc('hub_log_external_event', {
      p_user_identifier: userEmail,
      p_evento: 'logout',
      p_sistema_id: ENFERMERIA_SISTEMA_ID,
      p_ip: null,
      p_user_agent: navigator.userAgent,
      p_latitud: null,
      p_longitud: null,
      p_metadata: { source: 'enfermeria' },
    })
  } catch (e) { console.warn('[HubTracker]', e) }
}

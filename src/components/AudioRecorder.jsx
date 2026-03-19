import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Loader2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

const MAX_SECONDS = 600 // 10 minutes
const WARN_AT = 480    // 8 minutes
const URGENT_AT = 540  // 9 minutes

// Beep sound generator
function playBeep(frequency = 800, duration = 200, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.value = volume
    osc.start()
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {}
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function AudioRecorder({ internacionId }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [transcription, setTranscription] = useState(null)
  const [warnLevel, setWarnLevel] = useState(0) // 0=ok, 1=warning, 2=urgent
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const intervalRef = useRef(null)
  const warnPlayedRef = useRef(false)
  const urgentPlayedRef = useRef(false)

  // Timer + warnings
  useEffect(() => {
    if (!recording) return
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1

        // Warning at 8 minutes
        if (next >= WARN_AT && next < URGENT_AT) {
          setWarnLevel(1)
          if (!warnPlayedRef.current) {
            warnPlayedRef.current = true
            playBeep(600, 300, 0.4)
            setTimeout(() => playBeep(600, 300, 0.4), 400)
          }
        }
        // Urgent at 9 minutes
        if (next >= URGENT_AT) {
          setWarnLevel(2)
          if (!urgentPlayedRef.current) {
            urgentPlayedRef.current = true
            playBeep(900, 200, 0.5)
            setTimeout(() => playBeep(900, 200, 0.5), 300)
            setTimeout(() => playBeep(900, 200, 0.5), 600)
          }
        }
        // Auto-stop at 10 minutes
        if (next >= MAX_SECONDS) {
          stopRecording()
          return MAX_SECONDS
        }
        return next
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [recording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setRecording(true)
      setSeconds(0)
      setWarnLevel(0)
      setAudioBlob(null)
      setTranscription(null)
      warnPlayedRef.current = false
      urgentPlayedRef.current = false
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('No se pudo acceder al micrófono. Verifique los permisos del navegador.')
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    clearInterval(intervalRef.current)
  }, [])

  const handleProcess = async () => {
    if (!audioBlob) return
    setProcessing(true)
    // TODO: Upload to Supabase Storage + call Edge Function for Whisper transcription
    // For now, simulate
    setTimeout(() => {
      setTranscription('⏳ La transcripción estará disponible cuando se configure la Edge Function de Whisper. El audio ha sido guardado.')
      setProcessing(false)
    }, 2000)
  }

  const timerColor = warnLevel === 2 ? 'text-red-600' : warnLevel === 1 ? 'text-amber-600' : 'text-slate-700'
  const progressPct = (seconds / MAX_SECONDS) * 100
  const progressColor = warnLevel === 2 ? 'bg-red-500' : warnLevel === 1 ? 'bg-amber-500' : 'bg-[#1565a0]'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#1565a0]" /> Grabación de Audio
        </h3>
        <span className="text-[10px] text-slate-400">Máximo 10 minutos por grabación</span>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-4">
        {!recording ? (
          <button onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md shadow-red-500/20">
            <Mic className="w-4 h-4" /> Grabar
          </button>
        ) : (
          <button onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-md">
            <Square className="w-4 h-4" /> Detener
          </button>
        )}

        {/* Timer */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-lg font-bold font-mono ${timerColor} transition-colors`}>
              {formatTimer(seconds)}
            </span>
            {warnLevel === 1 && (
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1 anim-fade">
                <AlertTriangle className="w-3 h-3" /> Faltan 2 minutos
              </span>
            )}
            {warnLevel === 2 && (
              <span className="text-xs font-bold text-red-600 flex items-center gap-1 anim-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> ¡Último minuto!
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${progressColor} transition-all duration-1000`}
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {recording && (
          <div className="w-3 h-3 rounded-full bg-red-500 anim-pulse" />
        )}
      </div>

      {/* Audio Preview + Process */}
      {audioBlob && !recording && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 anim-fade">
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10" />
          <button onClick={handleProcess} disabled={processing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
            {processing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando con IA...</> : '🤖 Procesar con Whisper'}
          </button>
        </div>
      )}

      {/* Transcription */}
      {transcription && (
        <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-4 anim-fade">
          <p className="text-xs font-bold text-green-700 flex items-center gap-1 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Transcripción
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{transcription}</p>
        </div>
      )}
    </div>
  )
}

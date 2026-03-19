import { useState } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'text-green-600 bg-green-50',
  warning: 'text-amber-600 bg-amber-50',
  error: 'text-red-600 bg-red-50',
  info: 'text-blue-600 bg-blue-50',
}

export default function Modal({ open, onClose, title, message, type = 'info', actions }) {
  if (!open) return null

  const Icon = icons[type]
  const color = colors[type]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {message && <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {actions ? actions : (
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1565a0] text-white hover:bg-[#12527e] transition-colors shadow-sm">
              Aceptar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Toast notification
export function Toast({ message, type = 'success', onClose }) {
  const Icon = icons[type]
  const bgClasses = {
    success: 'bg-green-600',
    warning: 'bg-amber-500',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${bgClasses[type]} text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 anim-slide-down`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Fullskjerm for tidtakerne: rolig, mørk og helt dekkende, så resten av appen ikke forstyrrer.
export function TimerShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tidtaker"
      className="fixed inset-0 z-50 bg-[#121214] text-white flex flex-col animate-fade-in"
    >
      <div className="flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Lukk tidtaker"
        >
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-8 pb-12">
        <div className="w-full max-w-sm text-center">{children}</div>
      </div>
    </div>
  )
}

interface RingProps {
  progress: number
  color: string
  label: string
  time: string
  secondary?: number
}

export function TimerRing({ progress, color, label, time, secondary }: RingProps) {
  const r = 92
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 200 200"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        {secondary !== undefined && (
          <circle
            cx="100" cy="100" r={r - 9} fill="none"
            stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (r - 9)}
            strokeDashoffset={2 * Math.PI * (r - 9) * (1 - secondary)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        )}
        <circle
          cx="100" cy="100" r={r} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-light tabular tracking-tight" aria-live="off">{time}</span>
        <span className="text-white/60 text-sm mt-2">{label}</span>
      </div>
    </div>
  )
}

export const timerPrimary =
  'inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-2xl bg-white text-[#121214] font-semibold transition-colors hover:bg-white/90'
export const timerSecondary =
  'inline-flex items-center justify-center gap-2 min-h-[56px] px-6 rounded-2xl bg-white/10 text-white font-medium transition-colors hover:bg-white/15'

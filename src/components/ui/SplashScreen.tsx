import { useEffect, useState } from 'react'

const R = 40
const C = 2 * Math.PI * R

// Fokusringen fylles mens appen starter, deretter tones skjermen ut.
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [filled, setFilled] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fill = requestAnimationFrame(() => setFilled(true))
    const fade = setTimeout(() => setFadeOut(true), 1100)
    const done = setTimeout(onDone, 1400)
    return () => { cancelAnimationFrame(fill); clearTimeout(fade); clearTimeout(done) }
  }, [onDone])

  return (
    <div
      onClick={onDone}
      aria-hidden
      className={`fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center gap-6 transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-ink/10" />
        <circle
          cx="50" cy="50" r={R} fill="none"
          stroke="rgb(var(--accent))" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={filled ? C * 0.25 : C}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight">Neurominder</p>
        <p className="text-sm text-subtle mt-1">Én ting om gangen</p>
      </div>
    </div>
  )
}

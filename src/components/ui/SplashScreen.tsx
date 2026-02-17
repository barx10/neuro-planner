import { useState, useEffect } from 'react'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800)
    const done = setTimeout(onDone, 2400)
    return () => { clearTimeout(timer); clearTimeout(done) }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-600 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #1e1b4b)' }}
    >
      <div className="flex flex-col items-center animate-scale-in">
        <img
          src="/splash.png"
          alt="Neuro Planner"
          className="w-full max-w-xs object-contain"
        />
      </div>
    </div>
  )
}

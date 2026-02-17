import { useState } from 'react'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false)

  const handleTap = () => {
    setFadeOut(true)
    setTimeout(onDone, 500)
  }

  return (
    <div
      onClick={handleTap}
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 cursor-pointer ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#1e1b4b' }}
    >
      <div className="flex flex-col items-center animate-scale-in">
        <img
          src="/splash.png"
          alt="Neurominder"
          className="w-full max-w-xs object-contain"
        />
        <p className="text-white/70 text-base -mt-16 animate-pulse font-semibold">Trykk for å fortsette</p>
      </div>
    </div>
  )
}

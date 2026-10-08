import { useEffect, useState } from 'react'

// Bakgrunnen matcher kanten på splash.png, så bildet glir sømløst inn.
const SPLASH_BG = '#171830'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fade = setTimeout(() => setFadeOut(true), 1100)
    const done = setTimeout(onDone, 1400)
    return () => { clearTimeout(fade); clearTimeout(done) }
  }, [onDone])

  return (
    <div
      onClick={onDone}
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: SPLASH_BG }}
    >
      <img src="/splash.png" alt="" className="h-full max-h-[720px] w-auto object-contain" />
    </div>
  )
}

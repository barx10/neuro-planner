import { useState, useEffect, useRef } from 'react'

export function useTimer(durationSeconds: number) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number>(undefined)

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (Notification.permission === 'granted') {
              new Notification('Oppgave fullført!', {
                body: 'Tid for neste oppgave.',
                icon: '/icon-192.png'
              })
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, remaining])

  return {
    remaining,
    running,
    progress: 1 - remaining / durationSeconds,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => { setRunning(false); setRemaining(durationSeconds) }
  }
}

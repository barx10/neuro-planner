import { useEffect, useRef } from 'react'

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let cancelled = false

    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release()
        } else {
          wakeLockRef.current = sentinel
        }
      } catch {
        // Feiler stille — f.eks. batteri lavt eller ikke støttet
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        acquire()
      }
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [])
}

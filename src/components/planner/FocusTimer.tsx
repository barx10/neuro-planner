import { useState, useEffect, useMemo } from 'react'
import { X, Play, Pause, RotateCcw } from 'lucide-react'
import type { Task } from '../../types'
import { useTimer } from '../../hooks/useTimer'
import { useWakeLock } from '../../hooks/useWakeLock'
import { formatSeconds } from '../../utils/timeHelpers'
import { hexToRgba } from '../../utils/colorHelpers'
import { notifyEncouragement, notifyCompletion } from '../../hooks/useNotifications'

const ENCOURAGEMENTS = [
  { emoji: '💪', text: 'Du gjør det bra!' },
  { emoji: '🌟', text: 'Kjempefint fokus!' },
  { emoji: '🔥', text: 'Du er i flytsonen!' },
  { emoji: '👏', text: 'Fortsett sånn!' },
  { emoji: '🧠', text: 'Hjernen din jobber hardt!' },
  { emoji: '✨', text: 'Så bra du holder ut!' },
  { emoji: '🎯', text: 'Du er på rett spor!' },
  { emoji: '💎', text: 'Fantastisk innsats!' },
]

const COMPLETIONS = [
  { emoji: '🎉', text: 'Bra jobba!', sub: 'Du klarte det!' },
  { emoji: '🏆', text: 'Mester!', sub: 'Oppgaven er fullført!' },
  { emoji: '⭐', text: 'Strålende!', sub: 'Nok en oppgave i boks!' },
  { emoji: '🥳', text: 'Hurra!', sub: 'Du er fantastisk!' },
  { emoji: '💪', text: 'Sterkt!', sub: 'Tid for en velfortjent pause?' },
]

interface FocusTimerProps {
  task: Task
  onClose: () => void
}

export function FocusTimer({ task, onClose }: FocusTimerProps) {
  useWakeLock()
  const totalSeconds = task.durationMinutes * 60
  const { remaining, running, progress, start, pause, reset } = useTimer(totalSeconds)

  const [encouragement, setEncouragement] = useState<typeof ENCOURAGEMENTS[0] | null>(null)
  const [encourageVisible, setEncourageVisible] = useState(false)
  const [shownAt, setShownAt] = useState<Set<string>>(new Set())
  const completion = useMemo(() => COMPLETIONS[Math.floor(Math.random() * COMPLETIONS.length)], [])

  const elapsed = totalSeconds - remaining

  useEffect(() => {
    if (!running || remaining === 0) return

    // Every 5 minutes of elapsed work
    const intervalIndex = Math.floor(elapsed / (5 * 60))
    const intervalKey = `interval-${intervalIndex}`
    if (intervalIndex > 0 && !shownAt.has(intervalKey)) {
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
      setEncouragement(msg)
      setEncourageVisible(true)
      setShownAt(prev => new Set(prev).add(intervalKey))
      notifyEncouragement(msg.emoji, msg.text)
      setTimeout(() => setEncourageVisible(false), 4000)
    }

    // Completion
    if (remaining === 0 && !shownAt.has('done')) {
      setShownAt(prev => new Set(prev).add('done'))
      notifyCompletion(task.emoji, task.title, completion.sub)
    }
  }, [running, remaining, elapsed, shownAt, task, completion])

  const radius = 90
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: `linear-gradient(135deg, ${hexToRgba(task.color, 0.95)}, ${hexToRgba('#1a1a2e', 0.97)})` }}
    >
      <div className="text-center px-8 w-full max-w-sm animate-scale-in">
        {/* Close */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Lukk tidtaker"
          >
            <X size={20} />
          </button>
        </div>

        {/* Task info */}
        <div className="text-5xl mb-3 drop-shadow-lg">{task.emoji}</div>
        <h2 className="text-2xl font-bold text-white mb-8">{task.title}</h2>

        {/* Progress ring */}
        <div className="relative w-64 h-64 mx-auto mb-10">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 200 200"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="progress-ring-animated"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-white tracking-wider">
              {formatSeconds(remaining)}
            </span>
            <span className="text-white/40 text-sm mt-1">
              {remaining === 0 ? 'Ferdig!' : running ? (
                encourageVisible && encouragement ? (
                  <span className="animate-fade-in text-white/70">{encouragement.emoji} {encouragement.text}</span>
                ) : 'Fokus...'
              ) : 'Pause'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {remaining === 0 ? (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold transition-all min-h-[56px] backdrop-blur-sm"
            >
              <RotateCcw size={20} /> Start på nytt
            </button>
          ) : running ? (
            <button
              onClick={pause}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-all min-h-[56px] backdrop-blur-sm"
            >
              <Pause size={20} /> Pause
            </button>
          ) : (
            <>
              <button
                onClick={start}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-gray-900 font-bold transition-all min-h-[56px] hover:scale-105 active:scale-95"
                style={{ boxShadow: '0 8px 30px rgba(255,255,255,0.2)' }}
              >
                <Play size={20} fill="currentColor" /> {remaining < totalSeconds ? 'Fortsett' : 'Start'}
              </button>
              {remaining < totalSeconds && (
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all min-h-[56px]"
                >
                  <RotateCcw size={20} />
                </button>
              )}
            </>
          )}
        </div>

        {remaining === 0 && (
          <div className="mt-6 animate-bounce-in text-center">
            <p className="text-4xl mb-2">{completion.emoji}</p>
            <p className="text-2xl font-bold text-white">{completion.text}</p>
            <p className="text-white/60 text-sm mt-1">{completion.sub}</p>
          </div>
        )}
      </div>
    </div>
  )
}

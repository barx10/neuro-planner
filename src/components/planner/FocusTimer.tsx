import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Check } from 'lucide-react'
import type { Task } from '../../types'
import { useTimer } from '../../hooks/useTimer'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useTaskStore } from '../../store/taskStore'
import { formatSeconds } from '../../utils/timeHelpers'
import { notifyEncouragement, notifyCompletion, completionSpeech } from '../../hooks/useNotifications'
import { preloadSpeech } from '../../hooks/useSpeech'
import { TimerShell, TimerRing, timerPrimary, timerSecondary } from './TimerShell'

const ENCOURAGEMENTS = [
  'Du gjør det bra.',
  'Fint fokus.',
  'Fortsett i ditt tempo.',
  'Godt holdt ut.',
  'Du er på rett spor.',
]

const COMPLETIONS = ['Bra jobbet.', 'Det klarte du.', 'Ferdig. Godt gjort.']

// Når oppmuntringen kommer, i sekunder fra start: hvert tiende minutt,
// eller halvveis i oppgaver under 20 minutter, så korte oppgaver også får en.
function encouragementMarks(totalSeconds: number): number[] {
  if (totalSeconds < 4 * 60) return []
  if (totalSeconds < 20 * 60) return [Math.floor(totalSeconds / 2)]
  return Array.from({ length: Math.ceil(totalSeconds / 600) - 1 }, (_, i) => (i + 1) * 600)
}

interface FocusTimerProps {
  task: Task
  onClose: () => void
}

export function FocusTimer({ task, onClose }: FocusTimerProps) {
  useWakeLock()
  const totalSeconds = task.durationMinutes * 60
  const { remaining, running, progress, start, pause, reset } = useTimer(totalSeconds)
  const { updateTask } = useTaskStore()

  const [completion] = useState(() => COMPLETIONS[Math.floor(Math.random() * COMPLETIONS.length)])
  const notified = useRef(new Set<string>())

  const elapsed = totalSeconds - remaining
  const done = remaining === 0

  // Litt oppmuntring underveis, vist i noen sekunder og lest opp
  const marks = encouragementMarks(totalSeconds)
  const intervalIndex = marks.filter(m => elapsed >= m).length
  const encouragement = running && intervalIndex > 0 && elapsed - marks[intervalIndex - 1] < 6
    ? ENCOURAGEMENTS[intervalIndex % ENCOURAGEMENTS.length]
    : null

  // Hent stemmen på forhånd, så den kommer med en gang
  useEffect(() => {
    if (!running) return
    preloadSpeech([
      ...marks.map((_, i) => ENCOURAGEMENTS[(i + 1) % ENCOURAGEMENTS.length]),
      completionSpeech(completion, task.title),
    ])
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done && !notified.current.has('done')) {
      notified.current.add('done')
      notifyCompletion(task.emoji, task.title, completion)
    }
  }, [done, task, completion])

  useEffect(() => {
    const key = `interval-${intervalIndex}`
    if (encouragement && !notified.current.has(key)) {
      notified.current.add(key)
      notifyEncouragement('', encouragement)
    }
  }, [encouragement, intervalIndex])

  const label = done ? completion : running ? (encouragement ?? 'Fokus') : remaining < totalSeconds ? 'Pause' : 'Klar'

  return (
    <TimerShell onClose={onClose}>
      <p className="text-4xl mb-3" aria-hidden>{task.emoji}</p>
      <h2 className="text-xl font-semibold mb-10">{task.title}</h2>

      <TimerRing progress={progress} color={task.color} label={label} time={formatSeconds(remaining)} />

      <div className="flex justify-center gap-3 mt-10">
        {done ? (
          <>
            <button onClick={reset} className={timerSecondary} aria-label="Start på nytt">
              <RotateCcw size={20} />
            </button>
            {!task.completed && (
              <button onClick={async () => { await updateTask(task.id, { completed: true }); onClose() }} className={timerPrimary}>
                <Check size={20} /> Marker som gjort
              </button>
            )}
          </>
        ) : running ? (
          <button onClick={pause} className={timerSecondary + ' px-8'}>
            <Pause size={20} /> Pause
          </button>
        ) : (
          <>
            {remaining < totalSeconds && (
              <button onClick={reset} className={timerSecondary} aria-label="Start på nytt">
                <RotateCcw size={20} />
              </button>
            )}
            <button onClick={start} className={timerPrimary}>
              <Play size={20} fill="currentColor" /> {remaining < totalSeconds ? 'Fortsett' : 'Start'}
            </button>
          </>
        )}
      </div>
    </TimerShell>
  )
}

import { useReducer, useEffect, useRef } from 'react'
import { Play, Pause, SkipForward, Check } from 'lucide-react'
import type { Task } from '../../types'
import { useWakeLock } from '../../hooks/useWakeLock'
import { formatSeconds } from '../../utils/timeHelpers'
import { useTaskStore } from '../../store/taskStore'
import { TimerShell, TimerRing, timerPrimary, timerSecondary } from './TimerShell'
import { notifyEncouragement, notifyCompletion, playDing } from '../../hooks/useNotifications'

const POMODORO_S = 25 * 60

const BREAK_MSGS = [
  'Fint fokus. Pust ut litt.',
  'En runde til er gjort. Slapp av.',
  'Godt jobbet. Ta et minutt.',
]

const ENCOURAGEMENTS = ['Du gjør det bra.', 'Fint fokus.', 'Fortsett i ditt tempo.']

type Phase = 'work' | 'break-choice' | 'break' | 'ready' | 'done'

interface PS {
  phase: Phase
  secondsLeft: number
  running: boolean
  sessionDuration: number
  workedS: number
  pomodoroCount: number
  breakDurationS: number
}

type Action =
  | { type: 'TICK' }
  | { type: 'TOGGLE_RUNNING' }
  | { type: 'CHOOSE_BREAK'; minutes: 3 | 5 }
  | { type: 'START_NEXT' }
  | { type: 'SKIP_BREAK' }

function pomodoroReducer(s: PS, a: Action, totalWorkS: number): PS {
  switch (a.type) {
    case 'TICK': {
      if (!s.running || s.secondsLeft <= 0) return s
      const left = s.secondsLeft - 1
      if (left > 0) return { ...s, secondsLeft: left }
      // Hit zero — transition phase
      if (s.phase === 'work') {
        const newWorked = s.workedS + s.sessionDuration
        return {
          ...s,
          secondsLeft: 0,
          running: false,
          workedS: newWorked,
          pomodoroCount: s.pomodoroCount + 1,
          phase: newWorked >= totalWorkS ? 'done' : 'break-choice',
        }
      }
      if (s.phase === 'break') {
        return { ...s, secondsLeft: 0, running: false, phase: 'ready' }
      }
      return { ...s, secondsLeft: 0, running: false }
    }
    case 'TOGGLE_RUNNING':
      return { ...s, running: !s.running }
    case 'CHOOSE_BREAK': {
      const bs = a.minutes * 60
      return { ...s, phase: 'break', breakDurationS: bs, secondsLeft: bs, running: true }
    }
    case 'START_NEXT': {
      const nextS = Math.min(POMODORO_S, totalWorkS - s.workedS)
      return { ...s, phase: 'work', sessionDuration: nextS, secondsLeft: nextS, running: true }
    }
    case 'SKIP_BREAK': {
      const nextS = Math.min(POMODORO_S, totalWorkS - s.workedS)
      return { ...s, phase: 'ready', running: false, sessionDuration: nextS, secondsLeft: nextS }
    }
  }
}

interface Props { task: Task; onClose: () => void }

export function PomodoroTimer({ task, onClose }: Props) {
  useWakeLock()
  const { updateTask } = useTaskStore()

  const totalWorkS = task.durationMinutes * 60
  const firstSessionS = Math.min(POMODORO_S, totalWorkS)

  const [state, dispatch] = useReducer(
    (s: PS, a: Action) => pomodoroReducer(s, a, totalWorkS),
    {
      phase: 'work',
      secondsLeft: firstSessionS,
      running: false,
      sessionDuration: firstSessionS,
      workedS: 0,
      pomodoroCount: 0,
      breakDurationS: 3 * 60,
    }
  )

  const encShownAt = useRef(new Set<string>())

  // Timer interval
  useEffect(() => {
    if (!state.running) return
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.running])

  // Side effects on phase change
  useEffect(() => {
    if (state.phase === 'break-choice') playDing('soft')
    else if (state.phase === 'ready') playDing('soft')
    else if (state.phase === 'done') {
      notifyCompletion(task.emoji, task.title, `${state.pomodoroCount} ${state.pomodoroCount === 1 ? 'økt' : 'økter'} fullført.`)
    }
  }, [state.phase]) // eslint-disable-line

  // Encouragements every 10 min during work
  const elapsed = state.phase === 'work' ? state.sessionDuration - state.secondsLeft : 0
  useEffect(() => {
    if (state.phase !== 'work' || !state.running || state.secondsLeft === 0) return
    const idx = Math.floor(elapsed / (10 * 60))
    const key = `${state.pomodoroCount}-${idx}`
    if (idx > 0 && !encShownAt.current.has(key)) {
      encShownAt.current.add(key)
      notifyEncouragement('', ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
    }
  }, [state.secondsLeft]) // eslint-disable-line

  const overallProgress = Math.min(
    1,
    (state.workedS + (state.phase === 'work' ? elapsed : 0)) / totalWorkS
  )
  const sessionProgress = state.phase === 'break'
    ? 1 - state.secondsLeft / state.breakDurationS
    : 1 - state.secondsLeft / state.sessionDuration
  const workedMin = Math.round(Math.min(state.workedS + (state.phase === 'work' ? elapsed : 0), totalWorkS) / 60)
  const sessions = Math.ceil(totalWorkS / POMODORO_S)
  const isBreak = state.phase === 'break'

  if (state.phase === 'break-choice') {
    return (
      <TimerShell onClose={onClose}>
        <p className="text-sm text-white/60 mb-2 tabular">Økt {state.pomodoroCount} av {sessions} er ferdig</p>
        <h2 className="text-2xl font-semibold mb-2">
          {BREAK_MSGS[(state.pomodoroCount - 1) % BREAK_MSGS.length]}
        </h2>
        <p className="text-white/60 mb-10">Hvor lang pause vil du ha?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => dispatch({ type: 'CHOOSE_BREAK', minutes: 3 })} className={timerSecondary + ' text-lg'}>
            3 min
          </button>
          <button onClick={() => dispatch({ type: 'CHOOSE_BREAK', minutes: 5 })} className={timerPrimary + ' text-lg'}>
            5 min
          </button>
        </div>
        <button onClick={() => dispatch({ type: 'SKIP_BREAK' })} className="mt-4 min-h-[48px] text-white/60 hover:text-white">
          Hopp over pausen
        </button>
      </TimerShell>
    )
  }

  if (state.phase === 'done') {
    return (
      <TimerShell onClose={onClose}>
        <p className="text-4xl mb-4" aria-hidden>{task.emoji}</p>
        <h2 className="text-2xl font-semibold mb-2">Ferdig. Godt jobbet.</h2>
        <p className="text-white/60 mb-10 tabular">
          {task.title} · {state.pomodoroCount} {state.pomodoroCount === 1 ? 'økt' : 'økter'} · {task.durationMinutes} min
        </p>
        {!task.completed && (
          <button onClick={async () => { await updateTask(task.id, { completed: true }); onClose() }} className={timerPrimary}>
            <Check size={20} /> Marker som gjort
          </button>
        )}
      </TimerShell>
    )
  }

  const label = state.phase === 'ready'
    ? 'Klar for neste økt'
    : isBreak
      ? 'Pause'
      : state.running ? 'Fokus' : state.secondsLeft < state.sessionDuration ? 'På pause' : 'Klar'

  return (
    <TimerShell onClose={onClose}>
      <p className="text-4xl mb-3" aria-hidden>{isBreak ? '\u2615' : task.emoji}</p>
      <h2 className="text-xl font-semibold">{isBreak ? 'Pause' : task.title}</h2>
      <p className="text-sm text-white/60 mt-1 mb-10 tabular">
        Økt {Math.min(state.pomodoroCount + (isBreak ? 0 : 1), sessions)} av {sessions} · {workedMin} av {task.durationMinutes} min
      </p>

      <TimerRing
        progress={sessionProgress}
        color={isBreak ? '#30a46c' : task.color}
        label={label}
        time={formatSeconds(state.secondsLeft)}
        secondary={overallProgress}
      />

      <div className="flex justify-center gap-3 mt-10">
        {state.phase === 'ready' && (
          <button onClick={() => dispatch({ type: 'START_NEXT' })} className={timerPrimary}>
            <Play size={20} fill="currentColor" /> Start neste økt
          </button>
        )}
        {state.phase === 'work' && (
          state.running ? (
            <button onClick={() => dispatch({ type: 'TOGGLE_RUNNING' })} className={timerSecondary + ' px-8'}>
              <Pause size={20} /> Pause
            </button>
          ) : (
            <button onClick={() => dispatch({ type: 'TOGGLE_RUNNING' })} className={timerPrimary}>
              <Play size={20} fill="currentColor" /> {state.secondsLeft < state.sessionDuration ? 'Fortsett' : 'Start'}
            </button>
          )
        )}
        {isBreak && (
          <button onClick={() => dispatch({ type: 'SKIP_BREAK' })} className={timerSecondary}>
            <SkipForward size={18} /> Hopp over
          </button>
        )}
      </div>
    </TimerShell>
  )
}

import { useReducer, useEffect, useRef } from 'react'
import { X, Play, Pause, SkipForward } from 'lucide-react'
import type { Task } from '../../types'
import { useWakeLock } from '../../hooks/useWakeLock'
import { formatSeconds } from '../../utils/timeHelpers'
import { hexToRgba } from '../../utils/colorHelpers'
import { notifyEncouragement, notifyCompletion, playDing } from '../../hooks/useNotifications'

const POMODORO_S = 25 * 60

const BREAK_MSGS = [
  'Flott fokus! Pust ut litt ☕',
  'En runde til i boks! Slapp av 🌿',
  'Nydelig jobbing! Ta et minutt 🧘',
]

const ENCOURAGEMENTS = [
  { emoji: '💪', text: 'Du gjør det bra!' },
  { emoji: '🌟', text: 'Kjempefint fokus!' },
  { emoji: '🔥', text: 'Du er i flytsonen!' },
  { emoji: '🧠', text: 'Hjernen din jobber hardt!' },
]

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
      notifyCompletion(task.emoji, task.title, `${state.pomodoroCount} 🍅 i boks!`)
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
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
      notifyEncouragement(msg.emoji, msg.text)
    }
  }, [state.secondsLeft]) // eslint-disable-line

  const overallProgress = Math.min(
    1,
    (state.workedS + (state.phase === 'work' ? elapsed : 0)) / totalWorkS
  )
  const sessionProgress = state.phase === 'break'
    ? 1 - state.secondsLeft / state.breakDurationS
    : 1 - state.secondsLeft / state.sessionDuration

  const isBreak = state.phase === 'break'
  const isGreen = isBreak || state.phase === 'break-choice' || state.phase === 'ready'
  const bg = isGreen
    ? 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(15,23,42,0.97))'
    : `linear-gradient(135deg, ${hexToRgba(task.color, 0.95)}, ${hexToRgba('#1a1a2e', 0.97)})`

  const radius = 90
  const circ = 2 * Math.PI * radius
  const outerR = 96
  const outerCirc = 2 * Math.PI * outerR

  // Break-choice screen
  if (state.phase === 'break-choice') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: bg }}>
        <div className="text-center px-8 w-full max-w-sm animate-scale-in">
          <div className="flex justify-end mb-4">
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 min-w-[48px] min-h-[48px] flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
          <div className="text-5xl mb-4">🍅</div>
          <p className="text-xl font-bold text-white mb-1">
            {BREAK_MSGS[(state.pomodoroCount - 1) % BREAK_MSGS.length]}
          </p>
          <p className="text-white/40 text-sm mb-10">Velg pauselengde</p>
          <div className="flex gap-4">
            <button
              onClick={() => dispatch({ type: 'CHOOSE_BREAK', minutes: 3 })}
              className="flex-1 py-5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xl transition-all active:scale-95 min-h-[80px]"
            >
              3 min
            </button>
            <button
              onClick={() => dispatch({ type: 'CHOOSE_BREAK', minutes: 5 })}
              className="flex-1 py-5 rounded-2xl bg-white text-gray-900 font-bold text-xl transition-all hover:scale-105 active:scale-95 min-h-[80px]"
            >
              5 min
            </button>
          </div>
          <p className="text-white/30 text-xs mt-5">
            {Math.round(state.workedS / 60)} / {task.durationMinutes} min jobbet
          </p>
        </div>
      </div>
    )
  }

  // Done screen
  if (state.phase === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(task.color, 0.95)}, ${hexToRgba('#1a1a2e', 0.97)})` }}>
        <div className="text-center px-8 w-full max-w-sm animate-scale-in">
          <div className="flex justify-end mb-4">
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 min-w-[48px] min-h-[48px] flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
          <p className="text-6xl mb-4">🎉</p>
          <p className="text-2xl font-bold text-white mb-2">Fantastisk!</p>
          <p className="text-white/60 text-sm mb-3">{task.title} er fullført!</p>
          <p className="text-white/30 text-sm">{state.pomodoroCount} 🍅 · {task.durationMinutes} min</p>
        </div>
      </div>
    )
  }

  // Work / Break / Ready — ring screen
  const ringColor = isBreak ? '#10b981' : 'white'
  const ringGlow = isBreak ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.4)'
  const centerLabel = state.phase === 'ready'
    ? 'Klar for neste runde?'
    : isBreak
      ? 'Pust ut...'
      : state.running ? 'Fokus...' : 'Pause'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: bg }}>
      <div className="text-center px-8 w-full max-w-sm animate-scale-in">
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 min-w-[48px] min-h-[48px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="text-4xl mb-2">{isBreak ? '☕' : task.emoji}</div>
        <h2 className="text-xl font-bold text-white mb-1">{isBreak ? 'Pause' : task.title}</h2>
        <p className="text-white/40 text-sm mb-6">
          {isBreak ? `🍅 × ${state.pomodoroCount}` : `🍅 × ${state.pomodoroCount + 1}`}
        </p>

        {/* Rings */}
        <div className="relative w-64 h-64 mx-auto mb-4">
          {/* Outer ring: overall task progress */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={outerR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle
              cx="100" cy="100" r={outerR} fill="none"
              stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={outerCirc}
              strokeDashoffset={outerCirc * (1 - overallProgress)}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>

          {/* Inner ring: current session */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200"
            role="progressbar" aria-valuenow={Math.round(sessionProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={ringColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - sessionProgress)}
              className="progress-ring-animated"
              style={{ filter: `drop-shadow(0 0 8px ${ringGlow})` }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-white tracking-wider">
              {formatSeconds(state.secondsLeft)}
            </span>
            <span className="text-white/40 text-sm mt-1">{centerLabel}</span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mb-6 px-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/35 rounded-full transition-all duration-1000"
              style={{ width: `${overallProgress * 100}%` }}
            />
          </div>
          <p className="text-white/25 text-xs mt-1.5">
            {Math.round(Math.min(state.workedS + (state.phase === 'work' ? elapsed : 0), totalWorkS) / 60)} / {task.durationMinutes} min
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {state.phase === 'ready' && (
            <button
              onClick={() => dispatch({ type: 'START_NEXT' })}
              className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-gray-900 font-bold min-h-[56px] hover:scale-105 active:scale-95 transition-all"
              style={{ boxShadow: '0 8px 30px rgba(255,255,255,0.2)' }}
            >
              <Play size={20} fill="currentColor" /> Start
            </button>
          )}

          {state.phase === 'work' && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_RUNNING' })}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold min-h-[56px] transition-all ${
                state.running
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-white text-gray-900 font-bold hover:scale-105 active:scale-95'
              }`}
              style={!state.running ? { boxShadow: '0 8px 30px rgba(255,255,255,0.2)' } : {}}
            >
              {state.running
                ? <><Pause size={20} /> Pause</>
                : <><Play size={20} fill="currentColor" /> {state.secondsLeft < state.sessionDuration ? 'Fortsett' : 'Start'}</>
              }
            </button>
          )}

          {isBreak && (
            <button
              onClick={() => dispatch({ type: 'SKIP_BREAK' })}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white/60 font-medium min-h-[56px] transition-all"
            >
              <SkipForward size={18} /> Hopp over
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

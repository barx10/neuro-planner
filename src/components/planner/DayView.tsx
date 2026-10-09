import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Sparkles, Play, CheckCircle2 } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useTaskStore } from '../../store/taskStore'
import { useSettingsStore } from '../../store/settingsStore'
import type { Task } from '../../types'
import { todayString, getScheduleForDate, parseDate, getEndTime, type ScheduleForDate } from '../../utils/timeHelpers'
import { useDayOverride } from '../../hooks/useDayOverride'
import { scheduleNotificationsForTasks, clearScheduledNotifications } from '../../hooks/useNotifications'
import { db } from '../../db/database'
import { TaskCard, type TimeStatus } from './TaskCard'
import { TaskForm } from './TaskForm'
import { FocusTimer } from './FocusTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { AiPlanner } from '../ai/AiPlanner'
import { MoodSelector } from '../ui/MoodSelector'

type TimeSlot = 'morgen' | 'dag' | 'kveld'

const SLOTS: { key: TimeSlot; label: string; defaultTime: string }[] = [
  { key: 'morgen', label: 'Morgen', defaultTime: '07:00' },
  { key: 'dag', label: 'Dag', defaultTime: '12:00' },
  { key: 'kveld', label: 'Kveld', defaultTime: '18:00' },
]

function getSlot(startTime: string): TimeSlot {
  const hour = parseInt(startTime.split(':')[0], 10)
  if (hour < 12) return 'morgen'
  if (hour < 17) return 'dag'
  return 'kveld'
}

function getTimeStatus(task: Task, now: Date): TimeStatus | undefined {
  if (task.completed) return undefined
  const [sh, sm] = task.startTime.split(':').map(Number)
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm).getTime()
  const endMs = startMs + task.durationMinutes * 60_000
  const nowMs = now.getTime()
  if (nowMs >= startMs && nowMs < endMs) return { type: 'in-progress', minutes: Math.ceil((endMs - nowMs) / 60_000) }
  if (nowMs < startMs) {
    const diff = Math.round((startMs - nowMs) / 60_000)
    if (diff <= 60) return { type: 'starts-in', minutes: diff }
  }
  return undefined
}

// Første uferdige oppgave som pågår, ellers den neste som ikke har startet.
function findFocusTask(tasks: Task[], statuses: Record<string, TimeStatus>, now: Date): { task: Task; current: boolean } | null {
  const current = tasks.find(t => statuses[t.id]?.type === 'in-progress')
  if (current) return { task: current, current: true }
  const hhmm = format(now, 'HH:mm')
  const next = tasks.find(t => !t.completed && t.startTime > hhmm)
  return next ? { task: next, current: false } : null
}

function ScheduleBanner({
  schedule,
  onSetFree,
  onClearOverride,
}: {
  schedule: ScheduleForDate
  onSetFree: () => void
  onClearOverride: () => void
}) {
  const { off, periods, overridden } = schedule
  if (!off && periods.length === 0 && !overridden) return null
  return (
    <div className="flex items-center gap-3 pl-4 pr-1 py-2 mb-4 rounded-xl bg-sunken min-h-[52px]">
      <div className="flex-1 text-sm">
        {overridden ? (
          <p className="font-semibold">Fri i dag</p>
        ) : off ? (
          <>
            <p className="font-semibold">Ingen planlegging i dag</p>
            <p className="text-muted">Satt i ukeskjemaet</p>
          </>
        ) : (
          <ul className="tabular">
            {periods.map(p => (
              <li key={p.start}>
                <span className="font-semibold">{p.label || 'Opptatt'}</span>{' '}
                <span className="text-muted">{p.start}–{p.end}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {overridden ? (
        <button onClick={onClearOverride} className="btn-ghost text-sm">Angre</button>
      ) : off ? (
        <button onClick={onSetFree} className="btn-ghost text-sm">Planlegg likevel</button>
      ) : (
        <button onClick={onSetFree} className="btn-ghost text-sm">Ta fri i dag</button>
      )}
    </div>
  )
}

export function DayView() {
  const [date, setDate] = useState(todayString())
  const [formState, setFormState] = useState<{ defaultTime?: string; task?: Task } | null>(null)
  const [timerTask, setTimerTask] = useState<Task | null>(null)
  const [showAi, setShowAi] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [mood, setMood] = useState<number | undefined>(undefined)
  const [moodLoaded, setMoodLoaded] = useState(false)
  const { tasks, loadTasks } = useTaskStore()
  const { settings } = useSettingsStore()
  const { override, setDayFree, clearOverride } = useDayOverride(date)
  const schedule = getScheduleForDate(date, settings.weeklySchedule, override)
  const planningOff = schedule.off

  const isToday = date === todayString()

  useEffect(() => {
    loadTasks(date)
  }, [date, loadTasks])

  useEffect(() => {
    db.moods.get(todayString()).then(entry => {
      setMood(entry?.level)
      setMoodLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (isToday && tasks.length > 0) scheduleNotificationsForTasks(tasks, date)
    return () => clearScheduledNotifications()
  }, [tasks, date, isToday])

  const tick = useCallback(() => setNow(new Date()), [])
  useEffect(() => {
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [tick])

  const statuses: Record<string, TimeStatus> = {}
  if (isToday) {
    for (const t of tasks) {
      const s = getTimeStatus(t, now)
      if (s) statuses[t.id] = s
    }
  }
  const focus = isToday ? findFocusTask(tasks, statuses, now) : null

  const completedCount = tasks.filter(t => t.completed).length
  const allDone = tasks.length > 0 && completedCount === tasks.length

  const current = parseDate(date)
  const weekStart = startOfWeek(current, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const goTo = (d: Date) => setDate(format(d, 'yyyy-MM-dd'))

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Dato */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className={`text-2xl font-semibold leading-tight ${isToday ? '' : 'capitalize'}`}>
            {isToday ? 'I dag' : format(current, 'EEEE', { locale: nb })}
          </h2>
          <p className="text-muted">
            {isToday ? format(current, 'EEEE d. MMMM', { locale: nb }) : format(current, 'd. MMMM', { locale: nb })}
          </p>
        </div>
        {!isToday && (
          <button onClick={() => setDate(todayString())} className="btn-ghost text-accent hover:text-accent">
            Til i dag
          </button>
        )}
      </div>

      {/* Ukestripe */}
      <div className="flex items-center -mx-2 mb-5">
        <button onClick={() => goTo(subDays(current, 7))} className="icon-btn shrink-0 min-w-[40px]" aria-label="Forrige uke">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map(d => {
            const selected = isSameDay(d, current)
            const dayIsToday = format(d, 'yyyy-MM-dd') === todayString()
            return (
              <button
                key={d.toISOString()}
                onClick={() => goTo(d)}
                aria-label={format(d, 'EEEE d. MMMM', { locale: nb })}
                aria-current={selected ? 'date' : undefined}
                className="flex flex-col items-center py-1 min-h-[52px] rounded-xl"
              >
                <span className={`text-xs ${selected ? 'text-ink font-semibold' : 'text-subtle'}`}>
                  {format(d, 'EEEEE', { locale: nb }).toUpperCase()}
                </span>
                <span
                  className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-sm tabular ${
                    selected
                      ? 'bg-ink text-bg font-semibold'
                      : dayIsToday
                        ? 'text-accent font-semibold'
                        : 'text-ink'
                  }`}
                >
                  {format(d, 'd')}
                </span>
              </button>
            )
          })}
        </div>
        <button onClick={() => goTo(addDays(current, 7))} className="icon-btn shrink-0 min-w-[40px]" aria-label="Neste uke">
          <ChevronRight size={18} />
        </button>
      </div>

      <ScheduleBanner schedule={schedule} onSetFree={setDayFree} onClearOverride={clearOverride} />

      {isToday && moodLoaded && mood === undefined && (
        <div className="mb-5">
          <MoodSelector value={mood} onChange={setMood} />
        </div>
      )}

      {/* Nå / neste */}
      {focus && (
        <section className="mb-6 rounded-2xl bg-ink text-bg p-4 dark:bg-sunken dark:text-ink dark:ring-1 dark:ring-accent/40" aria-label={focus.current ? 'Nå' : 'Neste'}>
          <p className="text-sm opacity-75 tabular">
            {focus.current
              ? `Nå · ${statuses[focus.task.id].minutes} min igjen`
              : `Neste · ${focus.task.startTime}${statuses[focus.task.id] ? ` (om ${statuses[focus.task.id].minutes} min)` : ''}`}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <p className="flex-1 text-lg font-semibold leading-snug">
              <span aria-hidden className="mr-2">{focus.task.emoji}</span>
              {focus.task.title}
            </p>
            <button
              onClick={() => setTimerTask(focus.task)}
              className="btn shrink-0 bg-bg text-ink hover:bg-bg/90 dark:bg-accent dark:text-on-accent dark:hover:bg-accent/90"
            >
              <Play size={16} fill="currentColor" /> Start
            </button>
          </div>
          <p className="text-sm opacity-75 mt-1 tabular">
            {focus.task.startTime}–{getEndTime(focus.task.startTime, focus.task.durationMinutes)}
          </p>
        </section>
      )}

      {/* Fremdrift */}
      {tasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted tabular" aria-live="polite">
              {allDone ? (
                <span className="inline-flex items-center gap-1.5 text-success font-semibold">
                  <CheckCircle2 size={16} /> Alt er gjort. Godt jobbet.
                </span>
              ) : (
                `${completedCount} av ${tasks.length} gjort`
              )}
            </span>
          </div>
          <div className="h-1.5 bg-sunken rounded-full overflow-hidden" aria-hidden>
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${allDone ? 'bg-success' : 'bg-accent'}`}
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tom dag */}
      {tasks.length === 0 && (
        <div className="card p-6 mb-6 text-center">
          <p className="font-semibold">Ingenting planlagt ennå</p>
          <p className="text-sm text-muted mt-1 mb-5">
            {planningOff ? 'Du kan fortsatt legge til noe selv.' : 'Legg til én ting, eller få hjelp til å sette opp dagen.'}
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={() => setFormState({ defaultTime: '09:00' })} className="btn-primary">
              <Plus size={18} /> Legg til oppgave
            </button>
            {!planningOff && (
              <button onClick={() => setShowAi(true)} className="btn-secondary">
                <Sparkles size={16} /> Planlegg med AI
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dagsdeler */}
      {tasks.length > 0 && SLOTS.map(slot => {
        const slotTasks = tasks.filter(t => getSlot(t.startTime) === slot.key)
        return (
          <section key={slot.key} className="mb-6" aria-labelledby={`slot-${slot.key}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 id={`slot-${slot.key}`} className="label">
                {slot.label}
              </h3>
              <button
                onClick={() => setFormState({ defaultTime: slot.defaultTime })}
                className="icon-btn -mr-3"
                aria-label={`Legg til oppgave om ${slot.label.toLowerCase()}en`}
              >
                <Plus size={20} />
              </button>
            </div>
            {slotTasks.length > 0 ? (
              <ul className="space-y-2">
                {slotTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    timeStatus={statuses[task.id]}
                    onStartTimer={setTimerTask}
                    onEdit={t => setFormState({ task: t })}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-subtle pl-[60px]">Ingenting her</p>
            )}
          </section>
        )
      })}

      {tasks.length > 0 && !planningOff && (
        <button onClick={() => setShowAi(true)} className="btn-ghost w-full mb-4">
          <Sparkles size={16} /> Planlegg resten med AI
        </button>
      )}

      {formState && (
        <TaskForm
          date={date}
          defaultTime={formState.defaultTime}
          task={formState.task}
          onClose={() => setFormState(null)}
        />
      )}
      {showAi && <AiPlanner date={date} onClose={() => setShowAi(false)} />}
      {timerTask && (
        timerTask.durationMinutes >= 25
          ? <PomodoroTimer task={timerTask} onClose={() => setTimerTask(null)} />
          : <FocusTimer task={timerTask} onClose={() => setTimerTask(null)} />
      )}
    </div>
  )
}

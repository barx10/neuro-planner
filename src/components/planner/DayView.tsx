import { useState, useEffect, useCallback, useRef } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Plus, ChevronLeft, ChevronRight, Trophy, Sunrise, Sun, Moon } from 'lucide-react'
import { format, addDays, subDays, startOfWeek } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useTaskStore } from '../../store/taskStore'
import type { Task } from '../../types'
import { formatDate, todayString } from '../../utils/timeHelpers'
import { scheduleNotificationsForTasks, getCurrentTask, clearScheduledNotifications } from '../../hooks/useNotifications'
import { TaskCard } from './TaskCard'
import { TaskForm } from './TaskForm'
import { FocusTimer } from './FocusTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { AiPlanner } from '../ai/AiPlanner'

type TimeSlot = 'morgen' | 'dag' | 'kveld'

const SLOTS: { key: TimeSlot; label: string; icon: typeof Sunrise; color: string; defaultTime: string; emoji: string }[] = [
  { key: 'morgen', label: 'Morgen', icon: Sunrise, color: '#f59e0b', defaultTime: '07:00', emoji: '\u{1F305}' },
  { key: 'dag', label: 'Dag', icon: Sun, color: '#6366f1', defaultTime: '12:00', emoji: '\u2600\uFE0F' },
  { key: 'kveld', label: 'Kveld', icon: Moon, color: '#8b5cf6', defaultTime: '18:00', emoji: '\u{1F319}' },
]

function getSlot(startTime: string): TimeSlot {
  const hour = parseInt(startTime.split(':')[0], 10)
  if (hour < 12) return 'morgen'
  if (hour < 17) return 'dag'
  return 'kveld'
}

function getTimeStatus(task: Task, dateStr: string): { type: 'starts-in' | 'in-progress'; minutes: number } | undefined {
  if (task.completed) return undefined
  const today = todayString()
  if (dateStr !== today) return undefined

  const now = new Date()
  const [sh, sm] = task.startTime.split(':').map(Number)
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm).getTime()
  const endMs = startMs + task.durationMinutes * 60 * 1000
  const nowMs = now.getTime()

  if (nowMs >= startMs && nowMs < endMs) {
    return { type: 'in-progress', minutes: Math.ceil((endMs - nowMs) / 60000) }
  }
  if (nowMs < startMs) {
    const diff = Math.round((startMs - nowMs) / 60000)
    if (diff <= 60) return { type: 'starts-in', minutes: diff }
  }
  return undefined
}

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6']

function ConfettiParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${8 + (i / 11) * 84}%`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    size: i % 3 === 0 ? 8 : i % 3 === 1 ? 6 : 5,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute top-1/2 rounded-full animate-confetti-fall"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

export function DayView() {
  const [date, setDate] = useState(todayString())
  const [formSlot, setFormSlot] = useState<TimeSlot | null>(null)
  const [timerTask, setTimerTask] = useState<Task | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [timeStatuses, setTimeStatuses] = useState<Record<string, { type: 'starts-in' | 'in-progress'; minutes: number }>>({})
  const [showConfetti, setShowConfetti] = useState(false)
  const prevAllDone = useRef(false)
  const { tasks, loadTasks, reorderTasks } = useTaskStore()

  useEffect(() => {
    loadTasks(date)
  }, [date, loadTasks])

  // Schedule notifications when tasks change (today only)
  useEffect(() => {
    const isToday = date === todayString()
    if (isToday && tasks.length > 0) {
      scheduleNotificationsForTasks(tasks, date)
    }
    return () => clearScheduledNotifications()
  }, [tasks, date])

  // Update "now" indicator and time statuses every 30 seconds
  const updateCurrentTask = useCallback(() => {
    const current = getCurrentTask(tasks, date)
    setCurrentTaskId(current?.id ?? null)
    const statuses: Record<string, { type: 'starts-in' | 'in-progress'; minutes: number }> = {}
    for (const t of tasks) {
      const s = getTimeStatus(t, date)
      if (s) statuses[t.id] = s
    }
    setTimeStatuses(statuses)
  }, [tasks, date])

  useEffect(() => {
    updateCurrentTask()
    const interval = setInterval(updateCurrentTask, 30_000)
    return () => clearInterval(interval)
  }, [updateCurrentTask])

  // Confetti when all tasks are completed
  const completedCount = tasks.filter(t => t.completed).length
  const allDone = tasks.length > 0 && completedCount === tasks.length

  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1000)
    }
    prevAllDone.current = allDone
  }, [allDone])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    reorderTasks(arrayMove(tasks, oldIndex, newIndex))
  }

  const goToday = () => setDate(todayString())
  const goPrev = () => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))
  const goNext = () => setDate(format(addDays(new Date(date), 1), 'yyyy-MM-dd'))

  const isToday = date === todayString()
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  // Week strip
  const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return {
      dateStr: format(d, 'yyyy-MM-dd'),
      dayLabel: format(d, 'EEE', { locale: nb }),
      dayNum: format(d, 'd'),
    }
  })

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      {/* AI Planner */}
      <div className="pt-4">
        <AiPlanner date={date} />
      </div>

      {/* Week strip */}
      <div className="flex gap-1 py-4">
        {weekDays.map(({ dateStr, dayLabel, dayNum }) => {
          const isSelected = dateStr === date
          const isDayToday = dateStr === todayString()
          return (
            <button
              key={dateStr}
              onClick={() => setDate(dateStr)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : isDayToday
                    ? 'bg-indigo-500/10 text-indigo-500'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide">{dayLabel}</span>
              <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>{dayNum}</span>
            </button>
          )
        })}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between pb-4">
        <button
          onClick={goPrev}
          className="p-2.5 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90"
          aria-label="Forrige dag"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <button
            onClick={goToday}
            className="text-lg font-bold capitalize hover:text-indigo-500 transition-colors"
          >
            {formatDate(date)}
          </button>
          {isToday && (
            <div className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 rounded-full px-3 py-0.5 mt-1 inline-block">
              I dag
            </div>
          )}
        </div>
        <button
          onClick={goNext}
          className="p-2.5 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90"
          aria-label="Neste dag"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="mb-5 glass rounded-2xl p-4 animate-fade-in relative">
          {showConfetti && <ConfettiParticles />}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              {allDone && <Trophy size={16} className="text-amber-500" />}
              <span className="text-sm font-semibold">
                {allDone ? 'Alt fullført! 🎉' : `${completedCount} av ${tasks.length}`}
              </span>
            </div>
            <span className="text-sm font-bold text-indigo-500">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: allDone
                  ? 'linear-gradient(90deg, #22c55e, #10b981)'
                  : 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
              }}
            />
          </div>
        </div>
      )}

      {/* Time slot sections */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {SLOTS.map(slot => {
            const slotTasks = tasks.filter(t => getSlot(t.startTime) === slot.key)
            const Icon = slot.icon
            return (
              <div key={slot.key} className="mb-5">
                {/* Section header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: slot.color + '18' }}
                    >
                      <Icon size={16} style={{ color: slot.color }} />
                    </div>
                    <h3 className="font-bold text-sm">{slot.label}</h3>
                    {slotTasks.length > 0 && (
                      <span className="text-[11px] text-gray-300 dark:text-gray-600 font-semibold">
                        {slotTasks.filter(t => t.completed).length}/{slotTasks.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setFormSlot(slot.key)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    style={{ color: slot.color }}
                    aria-label={`Legg til i ${slot.label}`}
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Tasks */}
                {slotTasks.length > 0 ? (
                  slotTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isNow={task.id === currentTaskId}
                      timeStatus={timeStatuses[task.id]}
                      onStartTimer={setTimerTask}
                    />
                  ))
                ) : (
                  <button
                    onClick={() => setFormSlot(slot.key)}
                    className="w-full rounded-2xl border-2 border-dashed p-4 text-center text-sm transition-all active:scale-[0.98] group"
                    style={{
                      borderColor: slot.color + '30',
                      color: slot.color + '60',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = slot.color + '60'
                      ;(e.currentTarget as HTMLButtonElement).style.color = slot.color + 'aa'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = slot.color + '30'
                      ;(e.currentTarget as HTMLButtonElement).style.color = slot.color + '60'
                    }}
                  >
                    <span className="text-lg mb-1 block">{slot.emoji}</span>
                    <span className="font-medium">Legg til {slot.label.toLowerCase()}-aktivitet</span>
                  </button>
                )}
              </div>
            )
          })}
        </SortableContext>
      </DndContext>

      {formSlot && (
        <TaskForm
          date={date}
          defaultTime={SLOTS.find(s => s.key === formSlot)!.defaultTime}
          onClose={() => setFormSlot(null)}
        />
      )}
      {timerTask && (
        timerTask.durationMinutes >= 25
          ? <PomodoroTimer task={timerTask} onClose={() => setTimerTask(null)} />
          : <FocusTimer task={timerTask} onClose={() => setTimerTask(null)} />
      )}
    </div>
  )
}

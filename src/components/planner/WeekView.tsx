import { useState, useEffect } from 'react'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '../../db/database'
import type { Task } from '../../types'
import { hexToRgba } from '../../utils/colorHelpers'

interface WeekViewProps {
  onSelectDay: (date: string) => void
}

export function WeekView({ onSelectDay }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [weekTasks, setWeekTasks] = useState<Record<string, Task[]>>({})

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    async function loadWeek() {
      const dateStrings = days.map(d => format(d, 'yyyy-MM-dd'))
      const allTasks = await db.tasks
        .where('date')
        .anyOf(dateStrings)
        .sortBy('order')
      const grouped: Record<string, Task[]> = {}
      for (const ds of dateStrings) grouped[ds] = []
      for (const t of allTasks) {
        if (grouped[t.date]) grouped[t.date].push(t)
      }
      setWeekTasks(grouped)
    }
    loadWeek()
  }, [weekStart])

  const today = new Date()

  return (
    <div className="max-w-lg mx-auto px-4">
      <div className="flex items-center justify-between py-5">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="p-2.5 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90"
          aria-label="Forrige uke"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-bold text-lg">
          Uke {format(weekStart, 'w', { locale: nb })}
        </h2>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="p-2.5 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90"
          aria-label="Neste uke"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayTasks = weekTasks[dateStr] || []
          const completed = dayTasks.filter(t => t.completed).length
          const isToday = isSameDay(day, today)
          const progress = dayTasks.length > 0 ? (completed / dayTasks.length) * 100 : 0

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              className={`w-full p-4 rounded-2xl text-left card-hover border animate-slide-up ${
                isToday
                  ? 'glass border-indigo-300/50 dark:border-indigo-500/30'
                  : 'glass border-white/30 dark:border-white/5'
              }`}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold capitalize">
                    {format(day, 'EEEE', { locale: nb })}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {format(day, 'd. MMM', { locale: nb })}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold bg-indigo-500 text-white px-2.5 py-0.5 rounded-full">
                      I dag
                    </span>
                  )}
                </div>
                {dayTasks.length > 0 && (
                  <span className="text-sm font-semibold text-gray-400">
                    {completed}/{dayTasks.length}
                  </span>
                )}
              </div>

              {/* Mini progress */}
              {dayTasks.length > 0 && (
                <div className="h-1.5 bg-gray-200/50 dark:bg-gray-700/30 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    }}
                  />
                </div>
              )}

              {dayTasks.length > 0 ? (
                <div className="flex gap-1.5 flex-wrap">
                  {dayTasks.slice(0, 6).map(task => (
                    <span
                      key={task.id}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${
                        task.completed ? 'opacity-40 line-through' : ''
                      }`}
                      style={{
                        backgroundColor: hexToRgba(task.color, 0.1),
                        color: task.color,
                      }}
                    >
                      {task.emoji} {task.title}
                    </span>
                  ))}
                  {dayTasks.length > 6 && (
                    <span className="text-[11px] text-gray-400 font-medium px-2 py-1">
                      +{dayTasks.length - 6} til
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-300 dark:text-gray-600 italic">Ingen oppgaver</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

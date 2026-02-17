import { useState, useEffect } from 'react'
import { Flame, Star, TrendingUp } from 'lucide-react'
import { db } from '../../db/database'
import type { Task } from '../../types'

const MOTIVATIONS = {
  low: [
    { emoji: '🌱', text: 'Hver liten oppgave teller! Du er i gang, og det er det viktigste.' },
    { emoji: '💛', text: 'Noen dager er tyngre enn andre. Vær snill med deg selv.' },
    { emoji: '🐢', text: 'Sakte og jevnt vinner løpet. Du gjør fremgang!' },
  ],
  medium: [
    { emoji: '💪', text: 'Du er godt i gang! Halvveis er mer enn halvparten av jobben.' },
    { emoji: '🎯', text: 'Fin balanse denne uken. Fortsett i ditt eget tempo!' },
    { emoji: '⚡', text: 'Flott innsats! Du viser at du har det i deg.' },
  ],
  high: [
    { emoji: '🏆', text: 'Fantastisk uke! Du har virkelig levert.' },
    { emoji: '🌟', text: 'Stjerneinnsats! Husk å feire det du har oppnådd.' },
    { emoji: '🔥', text: 'Du er on fire denne uken! Imponerende.' },
  ],
}

function getWeekDates(): string[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
  }
  return dates
}

const DAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

export function ProgressView() {
  const [weekTasks, setWeekTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const allTasks: Task[] = []
      for (const date of weekDates) {
        const tasks = await db.tasks.where('date').equals(date).toArray()
        allTasks.push(...tasks)
      }
      setWeekTasks(allTasks)
      setLoading(false)
    }
    load()
  }, [])

  const total = weekTasks.length
  const completed = weekTasks.filter(t => t.completed).length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const motivationLevel = percentage >= 70 ? 'high' : percentage >= 40 ? 'medium' : 'low'
  const motivations = MOTIVATIONS[motivationLevel]
  const motivation = motivations[Math.floor(Math.random() * motivations.length)]

  // Stats per day
  const dailyStats = weekDates.map(date => {
    const dayTasks = weekTasks.filter(t => t.date === date)
    const dayCompleted = dayTasks.filter(t => t.completed).length
    return { date, total: dayTasks.length, completed: dayCompleted }
  })

  // Streak: consecutive days with all tasks completed
  let streak = 0
  const todayIndex = weekDates.indexOf(today)
  for (let i = todayIndex >= 0 ? todayIndex : 6; i >= 0; i--) {
    const day = dailyStats[i]
    if (day.total > 0 && day.completed === day.total) {
      streak++
    } else if (day.total > 0) {
      break
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-sm">Laster progresjon...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <div className="py-5">
        <h2 className="text-2xl font-extrabold">Ukens progresjon</h2>
        <p className="text-sm text-gray-400 mt-1">Uke {getWeekNumber()}</p>
      </div>

      {/* Main progress circle */}
      <div className="glass rounded-2xl p-6 mb-5 flex flex-col items-center animate-fade-in">
        <div className="relative w-36 h-36 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-800" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="url(#progressGradient)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${percentage * 2.64} ${264 - percentage * 2.64}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{percentage}%</span>
            <span className="text-[11px] text-gray-400">fullført</span>
          </div>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-indigo-500">{completed}</p>
            <p className="text-[11px] text-gray-400">Fullført</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-[11px] text-gray-400">Totalt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{total - completed}</p>
            <p className="text-[11px] text-gray-400">Gjenstår</p>
          </div>
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="glass rounded-2xl p-5 mb-5 animate-fade-in">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-500" />
          Dag for dag
        </h3>
        <div className="flex gap-2 items-end justify-between">
          {dailyStats.map((day, i) => {
            const height = day.total > 0 ? Math.max((day.completed / day.total) * 100, 8) : 4
            const isToday = day.date === today
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-24 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[28px] rounded-lg transition-all duration-500 ${
                      day.total === 0
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : day.completed === day.total
                          ? 'bg-gradient-to-t from-indigo-500 to-violet-500'
                          : 'bg-indigo-200 dark:bg-indigo-900/50'
                    } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>
                  {DAY_LABELS[i]}
                </span>
                {day.total > 0 && (
                  <span className="text-[9px] text-gray-300 dark:text-gray-600">
                    {day.completed}/{day.total}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Streak & motivation */}
      <div className="space-y-3">
        {streak > 0 && (
          <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Flame size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-sm">{streak} {streak === 1 ? 'dag' : 'dager'} i strekk!</p>
              <p className="text-[11px] text-gray-400">Alle oppgaver fullført</p>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <span className="text-lg">{motivation.emoji}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1">
            {motivation.text}
          </p>
        </div>

        {completed > 0 && (
          <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Star size={18} className="text-green-500" />
            </div>
            <div>
              <p className="font-bold text-sm">Ukens høydepunkt</p>
              <p className="text-[11px] text-gray-400">
                Du har fullført {completed} {completed === 1 ? 'oppgave' : 'oppgaver'} denne uken!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeek + start.getDay()) / 7)
}

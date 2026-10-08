import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, subWeeks } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { db } from '../../db/database'
import type { MoodEntry, Task } from '../../types'
import { MoodSelector } from '../ui/MoodSelector'
import { MOODS } from '../../utils/moods'
import { todayString, parseDate } from '../../utils/timeHelpers'

const MESSAGES = {
  low: [
    'Hver lille oppgave teller. Du er i gang, og det er det viktigste.',
    'Noen uker er tyngre enn andre. Vær snill med deg selv.',
  ],
  medium: [
    'Du er godt i gang. Fortsett i ditt eget tempo.',
    'Fin balanse denne uken.',
  ],
  high: [
    'Sterk uke. Husk å legge merke til det du har fått til.',
    'Du har fått gjort mye denne uken.',
  ],
}

export function OverviewView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  const weekKey = days[0]
  const today = todayString()
  const isCurrentWeek = weekOffset === 0

  useEffect(() => {
    let cancelled = false
    const dates = Array.from({ length: 7 }, (_, i) => format(addDays(parseDate(weekKey), i), 'yyyy-MM-dd'))
    Promise.all([
      db.tasks.where('date').anyOf(dates).toArray(),
      db.moods.where('date').anyOf(dates).toArray(),
    ]).then(([t, m]) => {
      if (cancelled) return
      setTasks(t)
      setMoods(m)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [weekKey])

  const daily = days.map(date => {
    const dayTasks = tasks.filter(t => t.date === date)
    return { date, total: dayTasks.length, completed: dayTasks.filter(t => t.completed).length }
  })
  const total = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pct = total > 0 ? completed / total : 0

  // Dager på rad (bakover fra i dag) der alt planlagt ble gjort. Dager uten plan bryter ikke rekka.
  let streak = 0
  const lastIndex = isCurrentWeek ? days.indexOf(today) : 6
  for (let i = lastIndex; i >= 0; i--) {
    const d = daily[i]
    if (d.total === 0) continue
    if (d.completed === d.total) streak++
    else break
  }

  const level = pct >= 0.7 ? 'high' : pct >= 0.4 ? 'medium' : 'low'
  const message = MESSAGES[level][Number(weekKey.slice(-2)) % MESSAGES[level].length]

  const todayMood = moods.find(m => m.date === today)
  const avgMood = moods.length > 0 ? Math.round(moods.reduce((s, m) => s + m.level, 0) / moods.length) : 0

  const handleTodayMood = (level: 1 | 2 | 3 | 4 | 5) => {
    setMoods(prev => [...prev.filter(m => m.date !== today), { date: today, level }])
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-semibold leading-tight">
            Uke {format(weekStart, 'w', { locale: nb })}
          </h2>
          <p className="text-muted">
            {format(weekStart, 'd. MMM', { locale: nb })} – {format(addDays(weekStart, 6), 'd. MMM', { locale: nb })}
          </p>
        </div>
        <div className="flex -mr-3">
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="icon-btn" aria-label="Forrige uke">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={isCurrentWeek}
            className="icon-btn disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Neste uke"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm py-10 text-center">Laster …</p>
      ) : (
        <div className="space-y-4">
          {/* Oppgaver */}
          <section className="card p-5" aria-labelledby="ov-tasks">
            <h3 id="ov-tasks" className="label mb-3">Oppgaver</h3>
            {total === 0 ? (
              <p className="text-muted text-sm">Ingen oppgaver planlagt denne uken.</p>
            ) : (
              <>
                <p className="text-3xl font-semibold tabular">
                  {completed} <span className="text-lg font-normal text-muted">av {total} gjort</span>
                </p>
                <div className="h-1.5 bg-sunken rounded-full overflow-hidden mt-3" aria-hidden>
                  <div className="h-full bg-accent rounded-full" style={{ width: `${pct * 100}%` }} />
                </div>
                <p className="text-sm text-muted mt-3">{message}</p>
              </>
            )}

            <div className="grid grid-cols-7 gap-2 mt-6" role="list" aria-label="Dag for dag">
              {daily.map(d => {
                const ratio = d.total > 0 ? d.completed / d.total : 0
                const isToday = d.date === today
                return (
                  <div key={d.date} role="listitem" className="flex flex-col items-center gap-1.5"
                    aria-label={`${format(parseDate(d.date), 'EEEE', { locale: nb })}: ${d.completed} av ${d.total}`}>
                    <div className="w-full max-w-[28px] h-20 bg-sunken rounded-md flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-md ${ratio === 1 ? 'bg-success' : 'bg-accent'}`}
                        style={{ height: `${ratio * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs capitalize ${isToday ? 'font-semibold text-ink' : 'text-subtle'}`}>
                      {format(parseDate(d.date), 'EEEEEE', { locale: nb })}
                    </span>
                    <span className="text-xs text-subtle tabular h-4">{d.total > 0 ? `${d.completed}/${d.total}` : ''}</span>
                  </div>
                )
              })}
            </div>

            {streak > 1 && (
              <p className="flex items-center gap-2 text-sm mt-4 pt-4 border-t border-line">
                <Flame size={16} className="text-[#f2a33a]" aria-hidden />
                <span><span className="font-semibold">{streak} dager på rad</span> <span className="text-muted">med alt gjort</span></span>
              </p>
            )}
          </section>

          {/* Energi */}
          <section className="card p-5" aria-labelledby="ov-energy">
            <h3 id="ov-energy" className="label mb-3">Energi</h3>
            {isCurrentWeek && !todayMood && (
              <div className="mb-4 pb-4 border-b border-line">
                <MoodSelector bare onChange={handleTodayMood} />
              </div>
            )}
            <div className="grid grid-cols-7 gap-2">
              {days.map(date => {
                const entry = moods.find(m => m.date === date)
                const mood = entry ? MOODS[entry.level - 1] : null
                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${mood ? 'text-xl' : 'bg-sunken'}`}
                      title={mood?.label}
                    >
                      {mood ? <span role="img" aria-label={mood.label}>{mood.emoji}</span> : <span className="sr-only">Ikke registrert</span>}
                    </span>
                    <span className={`text-xs capitalize ${date === today ? 'font-semibold text-ink' : 'text-subtle'}`}>
                      {format(parseDate(date), 'EEEEEE', { locale: nb })}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-muted mt-4">
              {moods.length === 0
                ? 'Ingen registreringer denne uken.'
                : `Snitt: ${MOODS[avgMood - 1].label.toLowerCase()} · registrert ${moods.length} av 7 dager`}
            </p>
          </section>
        </div>
      )}
    </div>
  )
}

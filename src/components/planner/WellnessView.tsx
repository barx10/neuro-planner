import { useState, useEffect } from 'react'
import { format, subDays, startOfWeek, addDays } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '../../db/database'
import type { MoodEntry } from '../../types'
import { MoodSelector } from '../ui/MoodSelector'
import { todayString } from '../../utils/timeHelpers'

const MOOD_CONFIG = [
  { level: 1, emoji: '\u{1F629}', label: 'Veldig lav', color: '#ef4444', bg: '#fef2f2' },
  { level: 2, emoji: '\u{1F614}', label: 'Lav', color: '#f59e0b', bg: '#fffbeb' },
  { level: 3, emoji: '\u{1F610}', label: 'Middels', color: '#6366f1', bg: '#eef2ff' },
  { level: 4, emoji: '\u{1F60A}', label: 'God', color: '#22c55e', bg: '#f0fdf4' },
  { level: 5, emoji: '\u{1F929}', label: 'Topp', color: '#a855f7', bg: '#faf5ff' },
]

export function WellnessView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null)

  const weekStart = startOfWeek(subDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    async function load() {
      const dateStrings = days.map(d => format(d, 'yyyy-MM-dd'))
      const entries = await db.moods.where('date').anyOf(dateStrings).toArray()
      setMoods(entries)

      const todayEntry = await db.moods.get(todayString())
      if (todayEntry) setTodayMood(todayEntry)
    }
    load()
  }, [weekOffset])

  const getMoodForDate = (dateStr: string) => moods.find(m => m.date === dateStr)

  const avgLevel = moods.length > 0
    ? Math.round(moods.reduce((sum, m) => sum + m.level, 0) / moods.length)
    : 0

  const avgConfig = avgLevel > 0 ? MOOD_CONFIG[avgLevel - 1] : null
  const isCurrentWeek = weekOffset === 0

  const handleTodayMood = (level: 1 | 2 | 3 | 4 | 5) => {
    setTodayMood({ date: todayString(), level })
    setMoods(prev => {
      const filtered = prev.filter(m => m.date !== todayString())
      return [...filtered, { date: todayString(), level }]
    })
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <div className="py-5">
        <h2 className="text-2xl font-extrabold">Velvære</h2>
        <p className="text-sm text-gray-400 mt-1">Følg med på energinivået ditt over tid</p>
      </div>

      {/* Today's mood */}
      {!todayMood && isCurrentWeek && (
        <div className="mb-5 animate-slide-down">
          <MoodSelector onChange={handleTodayMood} />
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-2.5 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/5 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90"
          aria-label="Forrige uke"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="font-bold">
            Uke {format(weekStart, 'w', { locale: nb })}
          </span>
          {isCurrentWeek && (
            <span className="ml-2 text-[11px] font-bold text-indigo-500 bg-indigo-500/10 rounded-full px-2.5 py-0.5">
              Denne uken
            </span>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="p-2.5 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/5 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90 disabled:opacity-30"
          aria-label="Neste uke"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekly mood chart */}
      <div className="glass rounded-2xl p-5 mb-5 animate-fade-in">
        <div className="flex items-end justify-between gap-2 h-48 mb-3">
          {days.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const entry = getMoodForDate(dateStr)
            const config = entry ? MOOD_CONFIG[entry.level - 1] : null
            const barHeight = entry ? (entry.level / 5) * 100 : 0
            const isToday = dateStr === todayString()

            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex flex-col items-center justify-end h-36">
                  {entry ? (
                    <div
                      className="w-full max-w-[40px] rounded-xl transition-all duration-500 flex items-start justify-center pt-2 animate-slide-up"
                      style={{
                        height: `${barHeight}%`,
                        background: `linear-gradient(180deg, ${config!.color}, ${config!.color}80)`,
                        animationDelay: `${i * 60}ms`,
                        animationFillMode: 'both',
                      }}
                    >
                      <span className="text-lg drop-shadow">{config!.emoji}</span>
                    </div>
                  ) : (
                    <div className="w-full max-w-[40px] h-4 rounded-xl bg-gray-100 dark:bg-gray-800" />
                  )}
                </div>
                <span className={`text-[11px] font-semibold capitalize ${
                  isToday ? 'text-indigo-500' : 'text-gray-400'
                }`}>
                  {format(day, 'EEE', { locale: nb })}
                </span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {MOOD_CONFIG.map(m => (
            <div key={m.level} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="text-[10px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly summary */}
      <div className="glass rounded-2xl p-5 animate-fade-in">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ukessammendrag</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl mb-1">{avgConfig?.emoji ?? '\u2796'}</div>
            <p className="text-[11px] text-gray-400 font-medium">Gjennomsnitt</p>
            <p className="text-sm font-bold">{avgConfig?.label ?? 'Ingen data'}</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">{moods.length > 0 ? MOOD_CONFIG[Math.max(...moods.map(m => m.level)) - 1].emoji : '\u2796'}</div>
            <p className="text-[11px] text-gray-400 font-medium">Beste dag</p>
            <p className="text-sm font-bold">
              {moods.length > 0 ? MOOD_CONFIG[Math.max(...moods.map(m => m.level)) - 1].label : 'Ingen data'}
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">{'\u{1F4CA}'}</div>
            <p className="text-[11px] text-gray-400 font-medium">Registrert</p>
            <p className="text-sm font-bold">{moods.length}/7 dager</p>
          </div>
        </div>

        {/* Daily breakdown */}
        {moods.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const entry = getMoodForDate(dateStr)
              const config = entry ? MOOD_CONFIG[entry.level - 1] : null
              const isToday = dateStr === todayString()

              return (
                <div key={dateStr} className="flex items-center gap-3">
                  <span className={`text-sm font-medium capitalize w-16 ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>
                    {format(day, 'EEE d.', { locale: nb })}
                  </span>
                  {entry ? (
                    <>
                      <div
                        className="h-2.5 rounded-full flex-1 transition-all"
                        style={{
                          background: `linear-gradient(90deg, ${config!.color}, ${config!.color}40)`,
                          width: `${(entry.level / 5) * 100}%`,
                          maxWidth: `${(entry.level / 5) * 100}%`,
                        }}
                      />
                      <span className="text-base">{config!.emoji}</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2.5 rounded-full flex-1 bg-gray-100 dark:bg-gray-800" />
                      <span className="text-base opacity-20">{'\u2796'}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

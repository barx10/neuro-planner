import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { normalizeDaySchedule, formatPeriod } from '../../utils/timeHelpers'
import type { BlockedPeriod, DaySchedule, WeekDay } from '../../types'

const WEEKDAYS: { key: WeekDay; label: string }[] = [
  { key: 'mon', label: 'Mandag' },
  { key: 'tue', label: 'Tirsdag' },
  { key: 'wed', label: 'Onsdag' },
  { key: 'thu', label: 'Torsdag' },
  { key: 'fri', label: 'Fredag' },
  { key: 'sat', label: 'Lørdag' },
  { key: 'sun', label: 'Søndag' },
]
const WORKDAYS: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri']

const EMPTY: DaySchedule = { off: false, periods: [] }

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function summary(day: DaySchedule): string {
  if (day.off) return 'Ingen planlegging'
  if (day.periods.length === 0) return 'Ledig hele dagen'
  return day.periods.map(formatPeriod).join(', ')
}

// Ukeskjema: flere opptatte perioder per dag, og dager uten planlegging (f.eks. helg).
export function WeekScheduleEditor() {
  const { settings, updateSettings } = useSettingsStore()
  const [expanded, setExpanded] = useState<WeekDay | null>(null)

  const getDay = (key: WeekDay): DaySchedule => normalizeDaySchedule(settings.weeklySchedule?.[key]) ?? EMPTY

  const saveDay = (key: WeekDay, day: DaySchedule) => {
    const next = { ...settings.weeklySchedule }
    if (!day.off && day.periods.length === 0) delete next[key]
    else next[key] = { off: day.off, periods: [...day.periods].sort((a, b) => a.start.localeCompare(b.start)) }
    updateSettings({ weeklySchedule: next })
  }

  const addPeriod = (key: WeekDay) => {
    const day = getDay(key)
    const last = day.periods[day.periods.length - 1]
    const start = last ? addMinutes(last.end, 60) : '08:00'
    const period: BlockedPeriod = { start, end: last ? addMinutes(start, 60) : '16:00', label: last ? '' : 'Skole/jobb' }
    saveDay(key, { ...day, periods: [...day.periods, period] })
  }

  const updatePeriod = (key: WeekDay, index: number, field: keyof BlockedPeriod, value: string) => {
    if ((field === 'start' || field === 'end') && !value) return
    const day = getDay(key)
    const periods = day.periods.map((p, i) => {
      if (i !== index) return p
      const next = { ...p, [field]: value }
      // Hold sluttid etter starttid
      if (field === 'start' && next.end <= next.start) next.end = addMinutes(next.start, 30)
      if (field === 'end' && next.end <= next.start) next.end = addMinutes(next.start, 30)
      return next
    })
    // Ikke sorter mens brukeren skriver, så feltene ikke hopper
    updateSettings({ weeklySchedule: { ...settings.weeklySchedule, [key]: { ...day, periods } } })
  }

  const removePeriod = (key: WeekDay, index: number) => {
    const day = getDay(key)
    saveDay(key, { ...day, periods: day.periods.filter((_, i) => i !== index) })
  }

  const copyToWorkdays = (key: WeekDay) => {
    const day = getDay(key)
    const next = { ...settings.weeklySchedule }
    for (const d of WORKDAYS) next[d] = { off: day.off, periods: day.periods.map(p => ({ ...p })) }
    updateSettings({ weeklySchedule: next })
  }

  return (
    <ul className="card divide-y divide-line">
      {WEEKDAYS.map(({ key, label }) => {
        const day = getDay(key)
        const isOpen = expanded === key
        return (
          <li key={key}>
            <button
              onClick={() => setExpanded(isOpen ? null : key)}
              className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left"
              aria-expanded={isOpen}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className={`block text-sm truncate tabular ${day.off ? 'text-subtle' : 'text-muted'}`}>{summary(day)}</span>
              </span>
              <ChevronDown size={18} className={`text-subtle shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 animate-fade-in">
                <button
                  role="switch"
                  aria-checked={!day.off}
                  onClick={() => saveDay(key, { ...day, off: !day.off })}
                  className="w-full flex items-center gap-3 min-h-[48px] text-left"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-medium">Planlegg denne dagen</span>
                    <span className="block text-sm text-subtle">
                      {day.off ? 'AI lager ingen plan, f.eks. i helger' : 'AI planlegger i den ledige tiden'}
                    </span>
                  </span>
                  <span className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${!day.off ? 'bg-accent' : 'bg-subtle/50'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${!day.off ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </button>

                {!day.off && (
                  <>
                    {day.periods.length > 0 && <p className="text-sm text-subtle">Opptatt:</p>}
                    {day.periods.map((p, i) => (
                      <div key={i} className="rounded-xl border border-line p-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={p.label}
                            onChange={e => updatePeriod(key, i, 'label', e.target.value)}
                            placeholder="Navn, f.eks. Skole"
                            aria-label="Navn på perioden"
                            className="field py-2 text-sm flex-1 min-w-0"
                          />
                          <button onClick={() => removePeriod(key, i)} className="icon-btn shrink-0" aria-label={`Fjern ${formatPeriod(p)}`}>
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <span className="text-sm text-subtle block mb-1">Fra</span>
                            <input type="time" value={p.start} onChange={e => updatePeriod(key, i, 'start', e.target.value)} className="field py-2 text-sm tabular" />
                          </label>
                          <label className="flex-1">
                            <span className="text-sm text-subtle block mb-1">Til</span>
                            <input type="time" value={p.end} onChange={e => updatePeriod(key, i, 'end', e.target.value)} className="field py-2 text-sm tabular" />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addPeriod(key)} className="btn-secondary w-full text-sm">
                      <Plus size={16} /> Legg til opptatt tid
                    </button>
                  </>
                )}

                {WORKDAYS.includes(key) && (
                  <button onClick={() => copyToWorkdays(key)} className="btn-ghost w-full text-sm">
                    Bruk samme oppsett alle hverdager
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

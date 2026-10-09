import { format, parse, addMinutes } from 'date-fns'

export function getEndTime(startTime: string, durationMinutes: number): string {
  const date = parse(startTime, 'HH:mm', new Date())
  return format(addMinutes(date, durationMinutes), 'HH:mm')
}

// "YYYY-MM-DD" som lokal dato. new Date("YYYY-MM-DD") tolkes som UTC og kan gi feil dag.
export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} t ${m} min` : `${h} t`
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

import type { BlockedPeriod, DaySchedule, WeekDay } from '../types'

export const WEEKDAY_MAP: Record<number, WeekDay> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun'
}

const isTime = (t: unknown): t is string => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)

// Gjør om lagrede verdier til DaySchedule. Eldre versjoner lagret én periode per dag direkte.
export function normalizeDaySchedule(value: unknown): DaySchedule | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Partial<DaySchedule> & Partial<BlockedPeriod>
  const raw: Partial<BlockedPeriod>[] = Array.isArray(v.periods) ? v.periods : 'start' in v ? [v] : []
  const periods = raw
    .filter((p): p is BlockedPeriod => isTime(p.start) && isTime(p.end) && p.start < p.end)
    .map(p => ({ start: p.start, end: p.end, label: p.label ?? '' }))
  return { off: !!v.off, periods }
}

export interface ScheduleForDate extends DaySchedule {
  overridden: boolean   // brukeren har tatt fri denne datoen
}

// Ukeskjemaet for en dato, med eventuell overstyring for akkurat den dagen.
// override.blockedPeriod === null betyr at brukeren har tatt fri.
export function getScheduleForDate(
  dateStr: string,
  weeklySchedule: Partial<Record<WeekDay, DaySchedule>> | undefined,
  override: { blockedPeriod: BlockedPeriod | null } | undefined
): ScheduleForDate {
  if (override !== undefined) {
    return { off: false, periods: override.blockedPeriod ? [override.blockedPeriod] : [], overridden: true }
  }
  const weekday = WEEKDAY_MAP[parseDate(dateStr).getDay()]
  const day = normalizeDaySchedule(weeklySchedule?.[weekday]) ?? { off: false, periods: [] }
  const periods = [...day.periods].sort((a, b) => a.start.localeCompare(b.start))
  return { off: day.off, periods, overridden: false }
}

export const formatPeriod = (p: BlockedPeriod) => `${p.label ? `${p.label} ` : ''}${p.start}–${p.end}`

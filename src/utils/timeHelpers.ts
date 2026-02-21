import { format, parse, addMinutes } from 'date-fns'
import { nb } from 'date-fns/locale'

export function formatTime(time: string): string {
  return time
}

export function getEndTime(startTime: string, durationMinutes: number): string {
  const date = parse(startTime, 'HH:mm', new Date())
  return format(addMinutes(date, durationMinutes), 'HH:mm')
}

export function formatDate(date: string): string {
  return format(new Date(date), 'EEEE d. MMMM', { locale: nb })
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}t ${m}min` : `${h}t`
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

import type { BlockedPeriod, WeekDay } from '../types'

export const WEEKDAY_MAP: Record<number, WeekDay> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun'
}

// Returnerer gjeldende opptatt-tid for en dato, hensyntar per-dag overstyring.
// override === undefined betyr ingen overstyring finnes (bruk ukeplan).
// override.blockedPeriod === null betyr eksplisitt fri dag.
export function getBlockedPeriodForDate(
  dateStr: string,
  weeklySchedule: Partial<Record<WeekDay, BlockedPeriod>> | undefined,
  override: { blockedPeriod: BlockedPeriod | null } | undefined
): BlockedPeriod | null {
  if (override !== undefined) return override.blockedPeriod

  if (!weeklySchedule) return null

  // Bruk lokal dato (unngå UTC midnatt-bug — dateStr er "YYYY-MM-DD")
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = WEEKDAY_MAP[date.getDay()]
  const period = weeklySchedule[weekday] ?? null
  // Valider at tidsverdier er gyldige HH:mm-strenger (ikke NaN fra gamle bugs)
  if (period && (!/^\d{2}:\d{2}$/.test(period.start) || !/^\d{2}:\d{2}$/.test(period.end))) return null
  return period
}

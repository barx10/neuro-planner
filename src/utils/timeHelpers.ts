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

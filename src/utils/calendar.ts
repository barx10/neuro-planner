import type { Task } from '../types'
import { parseDate } from './timeHelpers'

// Kalenderformat i UTC: 20261009T123000Z
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

type CalendarTask = Pick<Task, 'title' | 'date' | 'startTime' | 'durationMinutes' | 'reminderMinutes'>

function times(task: CalendarTask) {
  const start = parseDate(task.date)
  const [h, m] = task.startTime.split(':').map(Number)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + task.durationMinutes * 60_000)
  return { start: stamp(start), end: stamp(end) }
}

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function buildIcs(task: CalendarTask): string {
  const { start, end } = times(task)
  const alarm = task.reminderMinutes ?? 5
  const title = escapeText(task.title)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Neurominder//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${start}-${Math.random().toString(36).slice(2)}@neurominder`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    ...(alarm > 0
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, `TRIGGER:-PT${alarm}M`, 'END:VALARM']
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

// Laster ned kalenderfilen uten å forlate appen. Å navigere til filen låste den installerte
// appen, som åpner lenker på eget domene i sitt eget vindu uten tilbakeknapp.
export function downloadIcs(task: CalendarTask) {
  const blob = new Blob([buildIcs(task)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${task.title.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'avtale'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function googleCalendarUrl(task: CalendarTask): string {
  const { start, end } = times(task)
  const params = new URLSearchParams({ action: 'TEMPLATE', text: task.title, dates: `${start}/${end}` })
  return `https://calendar.google.com/calendar/render?${params}`
}

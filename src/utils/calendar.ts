import type { Task } from '../types'
import { parseDate } from './timeHelpers'

// Kalenderformat i UTC: 20261009T123000Z
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function times(task: Pick<Task, 'date' | 'startTime' | 'durationMinutes'>) {
  const start = parseDate(task.date)
  const [h, m] = task.startTime.split(':').map(Number)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + task.durationMinutes * 60_000)
  return { start: stamp(start), end: stamp(end) }
}

type CalendarTask = Pick<Task, 'title' | 'date' | 'startTime' | 'durationMinutes' | 'reminderMinutes'>

// Lenke til kalenderfil fra vår egen tjeneste. Åpner «Legg til» på iPhone og i Outlook, og lastes ned på Android.
export function icsUrl(task: CalendarTask): string {
  const { start, end } = times(task)
  const params = new URLSearchParams({
    title: task.title,
    start,
    end,
    alarm: String(task.reminderMinutes ?? 5),
  })
  return `/api/ics?${params}`
}

export function googleCalendarUrl(task: CalendarTask): string {
  const { start, end } = times(task)
  const params = new URLSearchParams({ action: 'TEMPLATE', text: task.title, dates: `${start}/${end}` })
  return `https://calendar.google.com/calendar/render?${params}`
}

import type { Task } from '../types'

interface PushNotification {
  id: string
  time: string
  title: string
  body: string
  emoji: string
  tag: string
}

export function buildNotificationSchedule(tasks: Task[], dateStr: string): PushNotification[] {
  const notifications: PushNotification[] = []
  const now = Date.now()

  for (const task of tasks) {
    if (task.completed) continue
    const [h, m] = task.startTime.split(':').map(Number)
    const [year, month, day] = dateStr.split('-').map(Number)
    const start = new Date(year, month - 1, day, h, m, 0, 0)
    const endMs = start.getTime() + task.durationMinutes * 60_000

    // Pre-warning: 5 min before
    const preTime = start.getTime() - 5 * 60_000
    if (preTime > now) {
      notifications.push({
        id: `${task.id}-pre`,
        time: new Date(preTime).toISOString(),
        title: `Om 5 minutter: ${task.title}`,
        body: 'Gjør deg klar for neste oppgave!',
        emoji: task.emoji,
        tag: `task-${task.id}-pre`,
      })
    }

    // Start
    if (start.getTime() > now) {
      notifications.push({
        id: `${task.id}-start`,
        time: start.toISOString(),
        title: task.title,
        body: 'Det er tid for å starte!',
        emoji: task.emoji,
        tag: `task-${task.id}-start`,
      })
    }

    // Nudge: 3 min after end
    const nudgeTime = endMs + 3 * 60_000
    if (nudgeTime > now) {
      notifications.push({
        id: `${task.id}-nudge`,
        time: new Date(nudgeTime).toISOString(),
        title: `Har du fullført "${task.title}"?`,
        body: 'Husk å markere oppgaven som ferdig!',
        emoji: task.emoji,
        tag: `task-${task.id}-nudge`,
      })
    }
  }

  return notifications
}

export async function syncScheduleToServer(tasks: Task[], dateStr: string) {
  const notifications = buildNotificationSchedule(tasks, dateStr)
  try {
    await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications }),
    })
  } catch {
    // Offline — client-side notifications still work as fallback
  }
}

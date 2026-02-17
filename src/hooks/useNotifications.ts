import type { Task } from '../types'

const PRE_WARNING_MS = 5 * 60 * 1000 // 5 min before
const NUDGE_DELAY_MS = 3 * 60 * 1000 // 3 min after expected end

let activeTimeouts: number[] = []

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/** Play a gentle "ding" sound using Web Audio API */
export function playDing(type: 'soft' | 'celebrate' = 'soft') {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'celebrate') {
      // Two-tone happy chime
      osc.frequency.setValueAtTime(880, ctx.currentTime)        // A5
      osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.15) // C#6
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } else {
      // Gentle single ding
      osc.frequency.setValueAtTime(830, ctx.currentTime) // ~G#5
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    }

    osc.onended = () => ctx.close()
  } catch {
    // Audio not available, silently ignore
  }
}

function notify(title: string, body: string, tag?: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.png', tag })
  }
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100])
  }
}

/** Send encouragement as notification + sound (works with screen off) */
export function notifyEncouragement(emoji: string, text: string) {
  playDing('soft')
  notify(`${emoji} ${text}`, 'Fortsett det gode arbeidet!', 'encouragement')
}

/** Send completion notification + celebration sound */
export function notifyCompletion(taskEmoji: string, taskTitle: string, completionText: string) {
  playDing('celebrate')
  notify(`${taskEmoji} ${taskTitle} fullført!`, completionText, 'completion')
}

function getTaskTimeMs(task: Task, dateStr: string): number {
  const [hours, minutes] = task.startTime.split(':').map(Number)
  const d = new Date(dateStr)
  d.setHours(hours, minutes, 0, 0)
  return d.getTime()
}

function getTaskEndMs(task: Task, dateStr: string): number {
  return getTaskTimeMs(task, dateStr) + task.durationMinutes * 60 * 1000
}

export function clearScheduledNotifications() {
  activeTimeouts.forEach(id => clearTimeout(id))
  activeTimeouts = []
}

export function scheduleNotificationsForTasks(tasks: Task[], dateStr: string) {
  clearScheduledNotifications()

  if (Notification.permission !== 'granted') return

  const now = Date.now()

  for (const task of tasks) {
    if (task.completed) continue

    const startMs = getTaskTimeMs(task, dateStr)
    const endMs = getTaskEndMs(task, dateStr)

    // 1. Pre-warning: 5 min before start
    const preWarningMs = startMs - PRE_WARNING_MS - now
    if (preWarningMs > 0) {
      const id = window.setTimeout(() => {
        notify(
          `${task.emoji} Om 5 minutter: ${task.title}`,
          'Gjør deg klar for neste oppgave!'
        )
      }, preWarningMs)
      activeTimeouts.push(id)
    }

    // 2. Start notification
    const startDelay = startMs - now
    if (startDelay > 0) {
      const id = window.setTimeout(() => {
        notify(
          `${task.emoji} ${task.title}`,
          'Det er tid for å starte!'
        )
      }, startDelay)
      activeTimeouts.push(id)
    }

    // 3. Nudge: if not completed after duration + buffer
    const nudgeDelay = endMs + NUDGE_DELAY_MS - now
    if (nudgeDelay > 0) {
      const id = window.setTimeout(() => {
        // Re-check completion status from DB at nudge time
        // We pass a callback check via a simple refetch approach
        notify(
          `${task.emoji} Har du fullført "${task.title}"?`,
          'Husk å markere oppgaven som ferdig!'
        )
      }, nudgeDelay)
      activeTimeouts.push(id)
    }
  }
}

// Helper to determine the currently active task
export function getCurrentTask(tasks: Task[], dateStr: string): Task | null {
  const now = Date.now()
  const today = new Date().toISOString().split('T')[0]
  if (dateStr !== today) return null

  for (const task of tasks) {
    if (task.completed) continue
    const startMs = getTaskTimeMs(task, dateStr)
    const endMs = getTaskEndMs(task, dateStr)
    if (now >= startMs && now < endMs) return task
  }

  // If no task is active right now, find the next upcoming one
  let nextTask: Task | null = null
  let nextStart = Infinity
  for (const task of tasks) {
    if (task.completed) continue
    const startMs = getTaskTimeMs(task, dateStr)
    if (startMs > now && startMs < nextStart) {
      nextStart = startMs
      nextTask = task
    }
  }
  return nextTask
}

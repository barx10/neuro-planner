import { useEffect } from 'react'
import { db } from '../db/database'
import { useTaskStore } from '../store/taskStore'
import { todayString } from '../utils/timeHelpers'
import { scheduleNotificationsForTasks, clearScheduledNotifications } from './useNotifications'

// Planlegger påminnelser for dagens oppgaver uansett hvilken dag eller fane som vises.
// Kjøres på nytt når oppgaver endres, og hvert kvarter så dagsskiftet fanges opp.
export function useTodayReminders() {
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const today = todayString()
      const tasks = await db.tasks.where('date').equals(today).toArray()
      if (!cancelled) scheduleNotificationsForTasks(tasks, today)
    }
    refresh()
    const unsubscribe = useTaskStore.subscribe(() => { refresh() })
    const id = setInterval(refresh, 15 * 60_000)
    return () => {
      cancelled = true
      unsubscribe()
      clearInterval(id)
      clearScheduledNotifications()
    }
  }, [])
}

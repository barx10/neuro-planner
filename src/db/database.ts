import Dexie, { type Table } from 'dexie'
import type { Task, Routine, MoodEntry, UserSettings, Activity, DayOverride } from '../types'

export class PlannerDB extends Dexie {
  tasks!: Table<Task>
  routines!: Table<Routine>
  moods!: Table<MoodEntry>
  settings!: Table<UserSettings>
  activities!: Table<Activity>
  dayOverrides!: Table<DayOverride>

  constructor() {
    super('neuro-planner')
    this.version(1).stores({
      tasks: 'id, date, routineId, completed',
      routines: 'id',
      moods: 'date',
      settings: 'name'
    })
    this.version(2).stores({
      tasks: 'id, date, routineId, completed',
      routines: 'id',
      moods: 'date',
      settings: 'name',
      activities: 'id, category'
    })
    this.version(3).stores({
      tasks: 'id, date, routineId, completed',
      routines: 'id',
      moods: 'date',
      settings: 'name',
      activities: 'id, category',
      dayOverrides: 'date'
    })
  }
}

export const db = new PlannerDB()

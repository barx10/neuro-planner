import Dexie, { type Table } from 'dexie'
import type { Task, Routine, MoodEntry, UserSettings, Activity } from '../types'

export class PlannerDB extends Dexie {
  tasks!: Table<Task>
  routines!: Table<Routine>
  moods!: Table<MoodEntry>
  settings!: Table<UserSettings>
  activities!: Table<Activity>

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
  }
}

export const db = new PlannerDB()

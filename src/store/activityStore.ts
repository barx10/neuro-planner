import { create } from 'zustand'
import type { Activity, ActivityCategory } from '../types'
import { db } from '../db/database'
import { nanoid } from 'nanoid'

interface ActivityStore {
  activities: Activity[]
  loadActivities: () => Promise<void>
  addActivity: (title: string, emoji: string, category: ActivityCategory) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  loadActivities: async () => {
    const activities = await db.activities.toArray()
    set({ activities })
  },
  addActivity: async (title, emoji, category) => {
    const activity: Activity = {
      id: nanoid(),
      title,
      emoji,
      category,
      createdAt: new Date().toISOString(),
    }
    await db.activities.add(activity)
    await get().loadActivities()
  },
  deleteActivity: async (id) => {
    await db.activities.delete(id)
    await get().loadActivities()
  },
}))

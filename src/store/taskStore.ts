import { create } from 'zustand'
import type { Task } from '../types'
import { db } from '../db/database'
import { nanoid } from 'nanoid'

interface TaskStore {
  tasks: Task[]
  loadTasks: (date: string) => Promise<void>
  addTask: (task: Omit<Task, 'id'>) => Promise<void>
  updateTask: (id: string, changes: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  reorderTasks: (tasks: Task[]) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loadTasks: async (date) => {
    const tasks = await db.tasks.where('date').equals(date).toArray()
    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime))
    set({ tasks })
  },
  addTask: async (task) => {
    const newTask = { ...task, id: nanoid() }
    await db.tasks.add(newTask)
    await get().loadTasks(task.date)
  },
  updateTask: async (id, changes) => {
    await db.tasks.update(id, changes)
    const tasks = get().tasks
    const task = tasks.find(t => t.id === id)
    if (task) await get().loadTasks(task.date)
  },
  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    await db.tasks.delete(id)
    if (task) await get().loadTasks(task.date)
  },
  toggleComplete: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (task) await get().updateTask(id, { completed: !task.completed })
  },
  reorderTasks: async (tasks) => {
    const updated = tasks.map((t, i) => ({ ...t, order: i }))
    await Promise.all(updated.map(t => db.tasks.update(t.id, { order: t.order })))
    set({ tasks: updated })
  }
}))

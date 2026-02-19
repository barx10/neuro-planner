export interface Task {
  id: string
  title: string
  emoji: string
  color: string
  startTime: string       // "HH:mm"
  durationMinutes: number
  date: string            // "YYYY-MM-DD"
  completed: boolean
  subtasks: Subtask[]
  routineId?: string
  notes?: string
  order: number
  pomodoro?: boolean
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Routine {
  id: string
  name: string
  emoji: string
  color: string
  tasks: Omit<Task, 'id' | 'date' | 'completed'>[]
}

export interface MoodEntry {
  date: string
  level: 1 | 2 | 3 | 4 | 5
  note?: string
}

export type ActivityCategory = 'arbeid' | 'husholdning' | 'behov'

export interface Activity {
  id: string
  title: string
  emoji: string
  category: ActivityCategory
  createdAt: string
}

export type AiProvider = 'gemini' | 'openai' | 'anthropic'

export type AiModel =
  | 'gemini-2.5-flash'
  | 'gemini-3-flash-preview'
  | 'gpt-5-mini'
  | 'claude-haiku-4-5-20250929'

export interface UserSettings {
  name: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  defaultView: 'day' | 'week'
  theme: 'light' | 'dark' | 'auto'
  aiProvider: AiProvider
  aiModel: AiModel
  apiKeys: {
    gemini: string
    openai: string
    anthropic: string
  }
}

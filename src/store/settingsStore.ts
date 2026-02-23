import { create } from 'zustand'
import type { UserSettings } from '../types'
import { db } from '../db/database'

const DEFAULT_SETTINGS: UserSettings = {
  name: 'user',
  soundEnabled: true,
  vibrationEnabled: true,
  defaultView: 'day',
  theme: 'auto',
  aiProvider: 'gemini',
  aiModel: 'gemini-2.5-flash',
  apiKeys: { gemini: '', openai: '', anthropic: '' },
  rememberKeys: true,
  weeklySchedule: {}
}

function applyTheme(theme: 'light' | 'dark' | 'auto') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

interface SettingsStore {
  settings: UserSettings
  loadSettings: () => Promise<void>
  updateSettings: (changes: Partial<UserSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loadSettings: async () => {
    const saved = await db.settings.get('user')
    if (saved) {
      const merged = { ...DEFAULT_SETTINGS, ...saved, apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...saved.apiKeys } }
      set({ settings: merged })
      applyTheme(merged.theme)
    } else {
      await db.settings.put(DEFAULT_SETTINGS)
      applyTheme(DEFAULT_SETTINGS.theme)
    }
  },
  updateSettings: async (changes) => {
    const updated = { ...get().settings, ...changes }
    set({ settings: updated })

    // When rememberKeys is off, strip apiKeys before writing to IndexedDB
    const toStore = updated.rememberKeys
      ? updated
      : { ...updated, apiKeys: { gemini: '', openai: '', anthropic: '' } }
    await db.settings.put(toStore)

    // If user just toggled rememberKeys off, clear persisted keys immediately
    if (changes.rememberKeys === false) {
      const current = await db.settings.get('user')
      if (current) {
        await db.settings.put({ ...current, apiKeys: { gemini: '', openai: '', anthropic: '' }, rememberKeys: false })
      }
    }

    if (changes.theme) applyTheme(changes.theme)
  }
}))

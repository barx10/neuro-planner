import { create } from 'zustand'
import type { UserSettings } from '../types'
import { db } from '../db/database'
import { PROVIDERS } from '../utils/aiProviders'
import { normalizeDaySchedule } from '../utils/timeHelpers'
import type { DaySchedule, WeekDay } from '../types'

const DEFAULT_SETTINGS: UserSettings = {
  name: 'user',
  soundEnabled: true,
  vibrationEnabled: true,
  defaultView: 'day',
  theme: 'auto',
  aiProvider: 'gemini',
  aiModel: 'gemini-3.8-flash',
  apiKeys: { gemini: '', openai: '', anthropic: '' },
  rememberKeys: true,
  latestTaskTime: '21:00',
  weeklySchedule: {}
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
let currentTheme: 'light' | 'dark' | 'auto' = 'auto'

function applyTheme(theme: 'light' | 'dark' | 'auto') {
  currentTheme = theme
  const dark = theme === 'dark' || (theme === 'auto' && darkQuery.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121214' : '#fafaf9')
}

// Følg enhetens tema live når brukeren har valgt «Som enheten»
darkQuery.addEventListener('change', () => {
  if (currentTheme === 'auto') applyTheme('auto')
})

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
      // Ukeskjema fra eldre versjoner hadde én periode per dag; gjør om til nytt format
      const schedule: Partial<Record<WeekDay, DaySchedule>> = {}
      for (const [day, value] of Object.entries(merged.weeklySchedule ?? {})) {
        const normalized = normalizeDaySchedule(value)
        if (normalized) schedule[day as WeekDay] = normalized
      }
      merged.weeklySchedule = schedule
      // Lagret modell kan være utgått (f.eks. gemini-3.6-flash). Bytt til leverandørens standard.
      const provider = PROVIDERS.find(p => p.value === merged.aiProvider) ?? PROVIDERS[0]
      if (!provider.models.some(m => m.value === merged.aiModel)) {
        merged.aiProvider = provider.value
        merged.aiModel = provider.models[0].value
      }
      await db.settings.put(merged.rememberKeys ? merged : { ...merged, apiKeys: DEFAULT_SETTINGS.apiKeys })
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

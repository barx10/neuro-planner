# Nevrodivergent Planlegger – Prosjektoppskrift for Claude Code

## Prosjektoversikt

Bygg en PWA-planlegger inspirert av Tiimo, tilpasset elever og voksne med ADHD og autisme.
Fokus: visuell struktur, lav kognitiv belastning, nedtellingstidtaker, AI-oppgavenedbrytning og rutiner.

---

## Teknologistack

- **Rammeverk:** React 18 + Vite 5
- **Språk:** TypeScript
- **Styling:** Tailwind CSS v3
- **Tilstandstyring:** Zustand
- **Lokal lagring:** Dexie.js (IndexedDB)
- **Dra-og-slipp:** @dnd-kit/core + @dnd-kit/sortable
- **Tidshåndtering:** date-fns
- **PWA:** vite-plugin-pwa
- **AI:** Anthropic API
- **Ikoner:** lucide-react
- **Varslinger:** Web Notifications API + service worker

---

## Initialiser prosjekt

```bash
npm create vite@latest neuro-planner -- --template react-ts
cd neuro-planner
npm install
npm install zustand dexie date-fns @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities nanoid
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

---

## Mappestruktur

```
src/
  components/
    planner/
      DayView.tsx          # Visuell dagsvisning med tidslinje
      WeekView.tsx         # Ukesvisning
      TaskCard.tsx         # Enkeltoppgave med farge, ikon, varighet
      TaskForm.tsx         # Opprett/rediger oppgave
      FocusTimer.tsx       # Nedtellingstidtaker med progress-ring (SVG)
      RoutineTemplates.tsx # Ferdige rutiner (morgen, skole, kveld)
    ai/
      AiPlanner.tsx        # Chat-grensesnitt for AI-planlegging
      TaskBreakdown.tsx    # Vis AI-genererte delsteg
    ui/
      ColorPicker.tsx
      EmojiPicker.tsx
      MoodSelector.tsx     # Energi/humørnivå ved dagens start
  store/
    taskStore.ts
    routineStore.ts
    settingsStore.ts
  db/
    database.ts            # Dexie.js-oppsett og tabeller
  hooks/
    useTimer.ts
    useNotifications.ts
    useAi.ts
  types/
    index.ts
  utils/
    timeHelpers.ts
    colorHelpers.ts
  App.tsx
  main.tsx
```

---

## Datamodeller (types/index.ts)

```typescript
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

export interface UserSettings {
  name: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  defaultView: 'day' | 'week'
  theme: 'light' | 'dark' | 'auto'
}
```

---

## Database (db/database.ts)

```typescript
import Dexie, { Table } from 'dexie'
import { Task, Routine, MoodEntry, UserSettings } from '../types'

export class PlannerDB extends Dexie {
  tasks!: Table<Task>
  routines!: Table<Routine>
  moods!: Table<MoodEntry>
  settings!: Table<UserSettings>

  constructor() {
    super('neuro-planner')
    this.version(1).stores({
      tasks: 'id, date, routineId, completed',
      routines: 'id',
      moods: 'date',
      settings: 'name'
    })
  }
}

export const db = new PlannerDB()
```

---

## Zustand-store (store/taskStore.ts)

```typescript
import { create } from 'zustand'
import { Task } from '../types'
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
    const tasks = await db.tasks.where('date').equals(date).sortBy('order')
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
```

---

## AI-integrasjon (hooks/useAi.ts)

```typescript
// Sett VITE_ANTHROPIC_API_KEY i .env.local
// NB: Kun for prototype – bruk backend-proxy i produksjon

export async function breakdownTask(taskTitle: string): Promise<string[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: `Du er en hjelpsom assistent for nevrodivergente brukere.
Svar ALLTID med kun en JSON-array av strenger. Ingen forklaring, ingen markdown.
Eksempel: ["Steg 1", "Steg 2", "Steg 3"]`,
      messages: [{
        role: 'user',
        content: `Del opp denne oppgaven i 3-5 enkle, konkrete steg for en person med ADHD: "${taskTitle}"`
      }]
    })
  })
  const data = await response.json()
  return JSON.parse(data.content[0].text.trim())
}

export async function generateDayPlan(input: string): Promise<Array<{
  title: string
  emoji: string
  startTime: string
  durationMinutes: number
}>> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: `Du lager dagplaner for nevrodivergente. Svar ALLTID med kun en JSON-array.
Hvert objekt har: title (string), emoji (string), startTime ("HH:mm"), durationMinutes (number).
Ingen forklaring, ingen markdown. Kun JSON.`,
      messages: [{
        role: 'user',
        content: `Lag en realistisk dagplan basert på dette: "${input}"`
      }]
    })
  })
  const data = await response.json()
  return JSON.parse(data.content[0].text.trim())
}
```

---

## Tidtaker-hook (hooks/useTimer.ts)

```typescript
import { useState, useEffect, useRef } from 'react'

export function useTimer(durationSeconds: number) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number>()

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (Notification.permission === 'granted') {
              new Notification('Oppgave fullfort!', {
                body: 'Tid for neste oppgave.',
                icon: '/icon-192.png'
              })
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, remaining])

  return {
    remaining,
    running,
    progress: 1 - remaining / durationSeconds,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => { setRunning(false); setRemaining(durationSeconds) }
  }
}
```

---

## Varslinger (hooks/useNotifications.ts)

```typescript
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function scheduleTaskNotification(task: {
  title: string
  startTime: string
  emoji: string
}) {
  const [hours, minutes] = task.startTime.split(':').map(Number)
  const taskTime = new Date()
  taskTime.setHours(hours, minutes, 0, 0)
  const msUntil = taskTime.getTime() - Date.now()
  if (msUntil <= 0) return

  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`${task.emoji} ${task.title}`, {
        body: 'Det er pa tide a starte!',
        icon: '/icon-192.png'
      })
    }
  }, msUntil)
}
```

---

## PWA-konfigurasjon (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Neuro Planner',
        short_name: 'Planner',
        description: 'Visuell planlegger for nevrodivergente',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
          handler: 'NetworkOnly'
        }]
      }
    })
  ]
})
```

---

## Ferdige rutinmaler

```typescript
export const DEFAULT_ROUTINES = [
  {
    id: 'morning',
    name: 'Morgenrutine',
    emoji: '🌅',
    color: '#f59e0b',
    tasks: [
      { title: 'Sta opp', emoji: '⏰', color: '#f59e0b', startTime: '07:00', durationMinutes: 5, subtasks: [], order: 0 },
      { title: 'Drikk vann', emoji: '💧', color: '#3b82f6', startTime: '07:05', durationMinutes: 2, subtasks: [], order: 1 },
      { title: 'Frokost', emoji: '🍳', color: '#22c55e', startTime: '07:10', durationMinutes: 15, subtasks: [], order: 2 },
      { title: 'Kle pa deg', emoji: '👕', color: '#8b5cf6', startTime: '07:25', durationMinutes: 10, subtasks: [], order: 3 },
      { title: 'Pakke sekk', emoji: '🎒', color: '#ef4444', startTime: '07:35', durationMinutes: 5, subtasks: [], order: 4 }
    ]
  },
  {
    id: 'evening',
    name: 'Kveldsrutine',
    emoji: '🌙',
    color: '#6366f1',
    tasks: [
      { title: 'Rydde', emoji: '🧹', color: '#6366f1', startTime: '20:00', durationMinutes: 10, subtasks: [], order: 0 },
      { title: 'Kveldsmat', emoji: '🥛', color: '#22c55e', startTime: '20:10', durationMinutes: 15, subtasks: [], order: 1 },
      { title: 'Tannpuss', emoji: '🦷', color: '#3b82f6', startTime: '20:30', durationMinutes: 5, subtasks: [], order: 2 },
      { title: 'Les bok', emoji: '📚', color: '#8b5cf6', startTime: '20:35', durationMinutes: 25, subtasks: [], order: 3 },
      { title: 'Legg deg', emoji: '😴', color: '#6366f1', startTime: '21:00', durationMinutes: 5, subtasks: [], order: 4 }
    ]
  }
]
```

---

## .env.local

```
VITE_ANTHROPIC_API_KEY=din_nøkkel_her
```

---

## Byggrekkefølge

Følg denne rekkefølgen nøyaktig:

1. Initialiser prosjekt og installer alle avhengigheter
2. Konfigurer Tailwind, Vite og PWA-plugin
3. Opprett types/index.ts med alle grensesnitt
4. Sett opp db/database.ts (Dexie)
5. Bygg alle Zustand-stores
6. Implementer useTimer og useNotifications
7. Bygg TaskCard-komponent
8. Bygg DayView med tidslinje og dra-og-slipp via @dnd-kit
9. Bygg FocusTimer med SVG progress-ring
10. Implementer AI-funksjonene i hooks/useAi.ts
11. Bygg TaskForm med ColorPicker og EmojiPicker
12. Bygg MoodSelector
13. Bygg RoutineTemplates med DEFAULT_ROUTINES
14. Bygg WeekView
15. Konfigurer PWA-manifest og service worker
16. Test varslinger og offline-modus
17. Responsivt design og tilgjengelighet (WCAG AA minimum)

---

## Designregler Claude Code skal følge

- Aldri mer enn 3 handlinger synlig om gangen
- Trykkeflater minimum 48x48px
- Fargekontrast minimum 4.5:1
- Animasjoner kun hvis prefers-reduced-motion ikke er satt
- Alltid bekreftelsesdialog før sletting
- Alltid vis loading-tilstand og suksess-tilbakemelding
- Ikke bruk rødt som eneste feilindikator

---

## Kommandoer

```bash
npm run dev      # Utviklingsserver
npm run build    # Produksjonsbygg
npm run preview  # Forhåndsvis PWA lokalt
```

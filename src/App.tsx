import { useState, useEffect, useCallback } from 'react'
import { Home, LayoutList, Heart, Settings, TrendingUp, Info } from 'lucide-react'
import { DayView } from './components/planner/DayView'
import { ActivitiesView } from './components/planner/ActivitiesView'
import { WellnessView } from './components/planner/WellnessView'
import { ProgressView } from './components/planner/ProgressView'
import { AboutView } from './components/planner/AboutView'
import { MoodSelector } from './components/ui/MoodSelector'
import { SettingsPanel } from './components/ui/SettingsPanel'
import { HelpPanel } from './components/ui/HelpPanel'
import { SplashScreen } from './components/ui/SplashScreen'
import { useSettingsStore } from './store/settingsStore'
import { requestNotificationPermission } from './hooks/useNotifications'
import { todayString } from './utils/timeHelpers'
import { db } from './db/database'
import type { MoodEntry } from './types'

type View = 'home' | 'activities' | 'wellness' | 'progress' | 'about'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [view, setView] = useState<View>('home')
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [mood, setMood] = useState<MoodEntry | null>(null)
  const { loadSettings } = useSettingsStore()
  const hideSplash = useCallback(() => setShowSplash(false), [])

  useEffect(() => {
    loadSettings()
    requestNotificationPermission()
    db.moods.get(todayString()).then(entry => {
      if (entry) setMood(entry)
    })
  }, [])

  const handleMoodChange = (level: 1 | 2 | 3 | 4 | 5) => {
    setMood({ date: todayString(), level })
  }

  return (
    <div className="min-h-screen">
      {showSplash && <SplashScreen onDone={hideSplash} />}
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300/20 dark:bg-purple-900/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-indigo-300/20 dark:bg-indigo-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-300/15 dark:bg-pink-900/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 glass rounded-b-2xl">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="orbit-wrapper">
            <h1 className="text-xl font-extrabold gradient-text glow-text tracking-tight">
              Neurominder
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2.5 rounded-xl hover:bg-gray-500/10 text-gray-400 transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90 text-lg font-bold"
              aria-label="Hjelp"
            >
              ?
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl hover:bg-gray-500/10 text-gray-400 transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-90"
              aria-label="Innstillinger"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mood selector on home only */}
      {view === 'home' && !mood && (
        <div className="animate-slide-down">
          <MoodSelector onChange={handleMoodChange} />
        </div>
      )}

      {/* Main content */}
      <main className="pb-24">
        {view === 'home' && <DayView />}
        {view === 'activities' && <ActivitiesView />}
        {view === 'wellness' && <WellnessView />}
        {view === 'progress' && <ProgressView />}
        {view === 'about' && <AboutView />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-4 left-4 right-4 z-30 glass rounded-2xl shadow-lg shadow-indigo-500/5 max-w-lg mx-auto">
        <div className="flex">
          {([
            { key: 'home' as const, icon: Home, label: 'Hjem' },
            { key: 'activities' as const, icon: LayoutList, label: 'Aktiviteter' },
            { key: 'progress' as const, icon: TrendingUp, label: 'Progresjon' },
            { key: 'wellness' as const, icon: Heart, label: 'Velvære' },
            { key: 'about' as const, icon: Info, label: 'Om' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex-1 flex flex-col items-center py-2.5 transition-all duration-200 min-h-[56px] rounded-2xl relative ${
                view === tab.key
                  ? 'text-indigo-500'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon
                size={22}
                className={`transition-transform duration-200 ${view === tab.key ? 'scale-110' : ''}`}
              />
              <span className="text-[11px] mt-1 font-semibold">{tab.label}</span>
              <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 rounded-full bg-indigo-500 transition-all duration-300 ${
                view === tab.key ? 'w-4 opacity-100' : 'w-0 opacity-0'
              }`} />
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default App

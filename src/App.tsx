import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, ListChecks, BarChart3, Settings, CircleHelp } from 'lucide-react'
import { DayView } from './components/planner/DayView'
import { ActivitiesView } from './components/planner/ActivitiesView'
import { OverviewView } from './components/planner/OverviewView'
import { SettingsPanel } from './components/ui/SettingsPanel'
import { HelpPanel } from './components/ui/HelpPanel'
import { SplashScreen } from './components/ui/SplashScreen'
import { QuickCapture } from './components/ai/QuickCapture'
import { useTodayReminders } from './hooks/useTodayReminders'
import { useSettingsStore } from './store/settingsStore'

type View = 'today' | 'activities' | 'overview'

const TABS = [
  { key: 'today' as const, icon: CalendarDays, label: 'I dag' },
  { key: 'activities' as const, icon: ListChecks, label: 'Aktiviteter' },
  { key: 'overview' as const, icon: BarChart3, label: 'Oversikt' },
]

// Splash vises bare første gang appen åpnes i en økt.
function shouldShowSplash(): boolean {
  try {
    if (sessionStorage.getItem('splash-shown')) return false
    sessionStorage.setItem('splash-shown', '1')
  } catch {
    // Lagring kan være blokkert; vis splash likevel
  }
  return true
}

function App() {
  const [showSplash, setShowSplash] = useState(shouldShowSplash)
  const [view, setView] = useState<View>('today')
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const { loadSettings } = useSettingsStore()
  const hideSplash = useCallback(() => setShowSplash(false), [])
  useTodayReminders()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <div className="min-h-screen">
      {showSplash && <SplashScreen onDone={hideSplash} />}

      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto pl-4 pr-1 h-14 flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">Neurominder</h1>
          <div className="flex items-center">
            <button onClick={() => setShowHelp(true)} className="icon-btn" aria-label="Hjelp">
              <CircleHelp size={20} />
            </button>
            <button onClick={() => setShowSettings(true)} className="icon-btn" aria-label="Innstillinger">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-40">
        {view === 'today' && <DayView />}
        {view === 'activities' && <ActivitiesView />}
        {view === 'overview' && <OverviewView />}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Hovedmeny"
      >
        <div className="max-w-lg mx-auto flex">
          {TABS.map(tab => {
            const active = view === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] transition-colors ${
                  active ? 'text-accent' : 'text-subtle hover:text-ink'
                }`}
              >
                <tab.icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <QuickCapture />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default App

import { useState } from 'react'
import { Trash2, Eye, EyeOff, Bell, BellOff, Check } from 'lucide-react'
import { Sheet } from './Sheet'
import { useSettingsStore } from '../../store/settingsStore'
import { db } from '../../db/database'
import { ConfirmDialog } from './ConfirmDialog'
import { requestNotificationPermission } from '../../hooks/useNotifications'
import type { AiProvider } from '../../types'
import { WeekScheduleEditor } from './WeekScheduleEditor'
import { PROVIDERS } from '../../utils/aiProviders'

interface SettingsPanelProps {
  onClose: () => void
}



export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettingsStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showKey, setShowKey] = useState<AiProvider | null>(null)
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotifStatus(granted ? 'granted' : Notification.permission)
  }

  const handleClearData = async () => {
    await db.tasks.clear()
    await db.routines.clear()
    setShowClearConfirm(false)
    window.location.reload()
  }

  const selectProvider = (provider: AiProvider) => {
    const p = PROVIDERS.find(p => p.value === provider)!
    updateSettings({ aiProvider: provider, aiModel: p.models[0].value })
  }

  const currentProvider = PROVIDERS.find(p => p.value === settings.aiProvider)!
  const currentKey = settings.apiKeys[settings.aiProvider]

  const segmented = (selected: boolean) =>
    `flex-1 min-h-[44px] px-3 rounded-lg text-sm font-medium transition-colors ${
      selected ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`

  return (
    <Sheet title="Innstillinger" onClose={onClose}>
      <div className="space-y-8">
        {/* AI */}
        <section aria-labelledby="set-ai">
          <h3 id="set-ai" className="label mb-3">AI</h3>
          <div className="card divide-y divide-line" role="radiogroup" aria-label="AI-leverandør">
            {PROVIDERS.map(provider => {
              const selected = settings.aiProvider === provider.value
              return (
                <button
                  key={provider.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectProvider(provider.value)}
                  className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left first:rounded-t-2xl last:rounded-b-2xl hover:bg-sunken transition-colors"
                >
                  <span className="flex-1 font-medium">{provider.label}</span>
                  {selected && <Check size={18} className="text-accent" />}
                </button>
              )
            })}
          </div>

          {currentProvider.models.length > 1 && (
            <div className="mt-3 flex gap-1 bg-sunken rounded-xl p-1" role="radiogroup" aria-label="Modell">
              {currentProvider.models.map(model => (
                <button
                  key={model.value}
                  role="radio"
                  aria-checked={settings.aiModel === model.value}
                  onClick={() => updateSettings({ aiModel: model.value })}
                  className={segmented(settings.aiModel === model.value)}
                >
                  {model.label}
                </button>
              ))}
            </div>
          )}

          <label className="block mt-4">
            <span className="text-sm font-medium mb-1.5 block">API-nøkkel for {currentProvider.label}</span>
            <div className="relative">
              <input
                type={showKey === settings.aiProvider ? 'text' : 'password'}
                value={currentKey}
                onChange={e => updateSettings({
                  apiKeys: { ...settings.apiKeys, [settings.aiProvider]: e.target.value }
                })}
                placeholder="Lim inn nøkkel"
                autoComplete="off"
                className="field pr-14 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(showKey === settings.aiProvider ? null : settings.aiProvider)}
                className="icon-btn absolute right-0 top-1/2 -translate-y-1/2"
                aria-label={showKey === settings.aiProvider ? 'Skjul nøkkel' : 'Vis nøkkel'}
              >
                {showKey === settings.aiProvider ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <p className="text-sm text-subtle mt-2">
            Nøkkelen lagres bare på denne enheten og sendes direkte til {currentProvider.label}.
          </p>

          <button
            role="switch"
            aria-checked={settings.rememberKeys}
            onClick={() => updateSettings({ rememberKeys: !settings.rememberKeys })}
            className="w-full flex items-center gap-3 mt-3 min-h-[56px] text-left"
          >
            <span className="flex-1">
              <span className="block text-sm font-medium">Husk nøkkelen</span>
              <span className="block text-sm text-subtle">
                {settings.rememberKeys ? 'Lagres til du fjerner den' : 'Glemmes når du lukker appen'}
              </span>
            </span>
            <span className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${settings.rememberKeys ? 'bg-accent' : 'bg-subtle/50'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.rememberKeys ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>

          <label className="flex items-center gap-3 mt-1 min-h-[56px]">
            <span className="flex-1">
              <span className="block text-sm font-medium">Seneste oppgavetid</span>
              <span className="block text-sm text-subtle">AI planlegger ikke etter dette</span>
            </span>
            <input
              type="time"
              value={settings.latestTaskTime}
              onChange={e => e.target.value && updateSettings({ latestTaskTime: e.target.value })}
              className="field w-auto py-2 tabular"
            />
          </label>
        </section>

        {/* Ukeskjema */}
        <section aria-labelledby="set-week">
          <h3 id="set-week" className="label mb-1">Ukeskjema</h3>
          <p className="text-sm text-subtle mb-3">Legg inn når du er opptatt. Tiden mellom periodene regnes som ledig. Slå av planlegging for dager som helg.</p>
          <WeekScheduleEditor />
        </section>

        {/* Utseende */}
        <section aria-labelledby="set-theme">
          <h3 id="set-theme" className="label mb-3">Utseende</h3>
          <div className="flex gap-1 bg-sunken rounded-xl p-1" role="radiogroup" aria-label="Tema">
            {([
              { value: 'light' as const, label: 'Lyst' },
              { value: 'dark' as const, label: 'Mørkt' },
              { value: 'auto' as const, label: 'Som enheten' },
            ]).map(theme => (
              <button
                key={theme.value}
                role="radio"
                aria-checked={settings.theme === theme.value}
                onClick={() => updateSettings({ theme: theme.value })}
                className={segmented(settings.theme === theme.value)}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </section>

        {/* Varsler */}
        <section aria-labelledby="set-notif">
          <h3 id="set-notif" className="label mb-3">Varsler</h3>
          {notifStatus === 'granted' ? (
            <p className="flex items-center gap-3 text-sm min-h-[48px]">
              <Bell size={18} className="text-success" /> Varsler er på
            </p>
          ) : notifStatus === 'denied' ? (
            <p className="flex items-start gap-3 text-sm min-h-[48px]">
              <BellOff size={18} className="text-muted mt-0.5" />
              <span>
                <span className="block font-medium">Varsler er blokkert</span>
                <span className="block text-subtle">Slå dem på i innstillingene for nettleseren eller telefonen.</span>
              </span>
            </p>
          ) : (
            <button onClick={handleEnableNotifications} className="btn-secondary w-full">
              <Bell size={18} /> Slå på varsler
            </button>
          )}
        </section>

        {/* Data */}
        <section aria-labelledby="set-data">
          <h3 id="set-data" className="label mb-3">Data</h3>
          <button onClick={() => setShowClearConfirm(true)} className="btn-secondary w-full text-danger">
            <Trash2 size={18} /> Slett alle oppgaver
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title="Slette alle oppgaver?"
        message="Alle oppgaver og rutiner slettes for godt. Aktiviteter, energilogg og innstillinger beholdes."
        confirmLabel="Slett alt"
        onConfirm={handleClearData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </Sheet>
  )
}

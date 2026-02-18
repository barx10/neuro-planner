import { useState } from 'react'
import { X, Trash2, Eye, EyeOff, Bell, BellOff } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { db } from '../../db/database'
import { ConfirmDialog } from './ConfirmDialog'
import { requestNotificationPermission } from '../../hooks/useNotifications'
import type { AiProvider, AiModel } from '../../types'

interface SettingsPanelProps {
  onClose: () => void
}

const PROVIDERS: {
  value: AiProvider
  label: string
  icon: string
  models: { value: AiModel; label: string }[]
}[] = [
  {
    value: 'gemini',
    label: 'Google Gemini',
    icon: '\u2728',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    icon: '\u{1F916}',
    models: [
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    icon: '\u{1F9E0}',
    models: [
      { value: 'claude-haiku-4-5-20250929', label: 'Claude Haiku 4.5' },
    ],
  },
]

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Innstillinger</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[48px] min-h-[48px] flex items-center justify-center transition-all active:scale-90"
            aria-label="Lukk"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* AI Provider */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
              AI-leverandør
            </label>
            <div className="space-y-2.5">
              {PROVIDERS.map(provider => (
                <button
                  key={provider.value}
                  onClick={() => selectProvider(provider.value)}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                    settings.aiProvider === provider.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/10'
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{provider.label}</p>
                    <p className="text-xs text-gray-400">
                      {provider.models.map(m => m.label).join(', ')}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    settings.aiProvider === provider.value
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {settings.aiProvider === provider.value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          {currentProvider.models.length > 1 && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                Modell
              </label>
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 rounded-2xl p-1.5">
                {currentProvider.models.map(model => (
                  <button
                    key={model.value}
                    onClick={() => updateSettings({ aiModel: model.value })}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 text-center ${
                      settings.aiModel === model.value
                        ? 'bg-white dark:bg-gray-700 shadow-md text-gray-900 dark:text-white'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
              API-nøkkel — {currentProvider.label}
            </label>
            <div className="relative">
              <input
                type={showKey === settings.aiProvider ? 'text' : 'password'}
                value={currentKey}
                onChange={e => updateSettings({
                  apiKeys: { ...settings.apiKeys, [settings.aiProvider]: e.target.value }
                })}
                placeholder="Lim inn API-nøkkel..."
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowKey(showKey === settings.aiProvider ? null : settings.aiProvider)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showKey === settings.aiProvider ? 'Skjul nøkkel' : 'Vis nøkkel'}
              >
                {showKey === settings.aiProvider ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {currentKey ? (
              <p className="text-[11px] text-green-500 mt-1.5 px-1 font-medium">Nøkkel lagret lokalt</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1.5 px-1">Nøkkelen lagres kun på din enhet</p>
            )}
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
              Tema
            </label>
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 rounded-2xl p-1.5">
              {([
                { value: 'light' as const, label: 'Lyst', icon: '\u2600\uFE0F' },
                { value: 'dark' as const, label: 'M\u00F8rkt', icon: '\u{1F319}' },
                { value: 'auto' as const, label: 'Auto', icon: '\u{1F4F1}' },
              ]).map(theme => (
                <button
                  key={theme.value}
                  onClick={() => updateSettings({ theme: theme.value })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    settings.theme === theme.value
                      ? 'bg-white dark:bg-gray-700 shadow-md text-gray-900 dark:text-white'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="text-base">{theme.icon}</span>
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
              Varsler
            </label>
            {notifStatus === 'granted' ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-green-100 dark:border-green-900/30 text-green-600">
                <Bell size={18} />
                <span className="font-semibold text-sm">Varsler er aktivert</span>
              </div>
            ) : notifStatus === 'denied' ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-500">
                <BellOff size={18} />
                <div>
                  <p className="font-semibold text-sm">Varsler er blokkert</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Endre i nettleser-/telefoninnstillinger</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleEnableNotifications}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all active:scale-[0.98]"
              >
                <Bell size={18} />
                <span className="font-semibold text-sm">Aktiver varsler</span>
              </button>
            )}
          </div>

          {/* Clear data */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
              Data
            </label>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-[0.98]"
            >
              <Trash2 size={18} />
              <span className="font-semibold text-sm">Slett alle oppgaver og rutiner</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title="Slett all data"
        message="Dette sletter alle oppgaver og rutiner permanent. Er du sikker?"
        onConfirm={handleClearData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}

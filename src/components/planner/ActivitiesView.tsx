import { useState, useEffect } from 'react'
import { X, Trash2, Briefcase, Home, Heart, Plus } from 'lucide-react'
import { useActivityStore } from '../../store/activityStore'
import type { ActivityCategory } from '../../types'
import { EmojiPicker } from '../ui/EmojiPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'

const CATEGORIES: { key: ActivityCategory; label: string; icon: typeof Briefcase; color: string; description: string }[] = [
  { key: 'arbeid', label: 'Arbeid', icon: Briefcase, color: '#6366f1', description: 'Jobb, skole, prosjekter' },
  { key: 'husholdning', label: 'Husholdning', icon: Home, color: '#f59e0b', description: 'Vaske, rydde, handle' },
  { key: 'behov', label: 'Behov', icon: Heart, color: '#ec4899', description: 'Spise, hvile, trening' },
]

const SUGGESTIONS: { title: string; emoji: string; category: ActivityCategory }[] = [
  // Arbeid
  { title: 'Jobbe', emoji: '\u{1F4BB}', category: 'arbeid' },
  { title: 'Skole', emoji: '\u{1F3EB}', category: 'arbeid' },
  { title: 'Lekser', emoji: '\u{1F4DA}', category: 'arbeid' },
  { title: 'M\u00F8te', emoji: '\u{1F4CB}', category: 'arbeid' },
  { title: 'E-post', emoji: '\u{1F4E7}', category: 'arbeid' },
  { title: 'Prosjekt', emoji: '\u{1F3AF}', category: 'arbeid' },
  // Husholdning
  { title: 'Vaske kl\u00E6r', emoji: '\u{1F9FA}', category: 'husholdning' },
  { title: 'Handle mat', emoji: '\u{1F6D2}', category: 'husholdning' },
  { title: 'Lage mat', emoji: '\u{1F373}', category: 'husholdning' },
  { title: 'Rydde', emoji: '\u{1F9F9}', category: 'husholdning' },
  { title: 'St\u00F8vsuge', emoji: '\u{1F9F9}', category: 'husholdning' },
  { title: 'Vaske bad', emoji: '\u{1F6BF}', category: 'husholdning' },
  { title: 'Oppvask', emoji: '\u{1FAE7}', category: 'husholdning' },
  { title: 'Kaste s\u00F8ppel', emoji: '\u{1F5D1}\uFE0F', category: 'husholdning' },
  // Behov
  { title: 'Frokost', emoji: '\u{1F95E}', category: 'behov' },
  { title: 'Lunsj', emoji: '\u{1F96A}', category: 'behov' },
  { title: 'Middag', emoji: '\u{1F35D}', category: 'behov' },
  { title: 'Trening', emoji: '\u{1F3CB}\uFE0F', category: 'behov' },
  { title: 'G\u00E5tur', emoji: '\u{1F6B6}', category: 'behov' },
  { title: 'Hvile', emoji: '\u{1F6CB}\uFE0F', category: 'behov' },
  { title: 'Dusje', emoji: '\u{1F6BF}', category: 'behov' },
  { title: 'Sove', emoji: '\u{1F634}', category: 'behov' },
  { title: 'Medisin', emoji: '\u{1F48A}', category: 'behov' },
  { title: 'Tannpuss', emoji: '\u{1FAE6}', category: 'behov' },
]

export function ActivitiesView() {
  const { activities, loadActivities, addActivity, deleteActivity } = useActivityStore()
  const [formCategory, setFormCategory] = useState<ActivityCategory | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formEmoji, setFormEmoji] = useState('\u2B50')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const handleAdd = async () => {
    if (!formTitle.trim() || !formCategory) return
    await addActivity(formTitle.trim(), formEmoji, formCategory)
    setFormTitle('')
    setFormEmoji('\u2B50')
    setFormCategory(null)
  }

  const handleSuggestion = async (s: typeof SUGGESTIONS[number]) => {
    const exists = activities.some(a => a.title === s.title && a.category === s.category)
    if (exists) return
    await addActivity(s.title, s.emoji, s.category)
  }

  const deleteTarget = deleteId ? activities.find(a => a.id === deleteId) : null

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <div className="py-5">
        <h2 className="text-2xl font-extrabold">Faste aktiviteter</h2>
        <p className="text-sm text-gray-400 mt-1">Aktivitetene dine, sortert etter kategori</p>
      </div>

      {CATEGORIES.map(cat => {
        const catActivities = activities.filter(a => a.category === cat.key)
        const Icon = cat.icon
        const isAdding = formCategory === cat.key
        return (
          <div key={cat.key} className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '18' }}
                >
                  <Icon size={16} style={{ color: cat.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{cat.label}</h3>
                  <p className="text-[11px] text-gray-400">{cat.description}</p>
                </div>
                {catActivities.length > 0 && (
                  <span className="text-[11px] text-gray-300 dark:text-gray-600 font-semibold">
                    {catActivities.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setFormCategory(isAdding ? null : cat.key)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ color: cat.color }}
                aria-label={`Legg til i ${cat.label}`}
              >
                {isAdding ? <X size={20} strokeWidth={2.5} /> : <Plus size={20} strokeWidth={2.5} />}
              </button>
            </div>

            {/* Inline add form */}
            {isAdding && (
              <div className="mb-3 p-3.5 rounded-2xl glass border border-white/40 dark:border-white/5 animate-slide-down space-y-3">
                <div className="flex gap-3 items-start">
                  <EmojiPicker value={formEmoji} onChange={setFormEmoji} />
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Aktivitetsnavn..."
                    className="flex-1 px-3.5 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!formTitle.trim()}
                  className="w-full py-3 btn-primary min-h-[48px] text-sm"
                >
                  Legg til
                </button>
              </div>
            )}

            {/* Activities list */}
            {catActivities.length > 0 ? (
              <div className="space-y-2">
                {catActivities.map((activity, i) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl glass border border-white/40 dark:border-white/5 animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                  >
                    <span className="text-xl">{activity.emoji}</span>
                    <span className="flex-1 font-medium text-sm">{activity.title}</span>
                    <button
                      onClick={() => setDeleteId(activity.id)}
                      className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-500/10 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Slett aktivitet"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : !isAdding ? (
              <button
                onClick={() => setFormCategory(cat.key)}
                className="w-full rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center text-sm text-gray-300 dark:text-gray-600 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-400 transition-all active:scale-[0.98]"
              >
                Trykk for å legge til
              </button>
            ) : null}
          </div>
        )
      })}

      {/* Suggestions */}
      <div className="mt-2 mb-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Vanlige gjøremål</h3>
        {CATEGORIES.map(cat => {
          const catSuggestions = SUGGESTIONS.filter(s => s.category === cat.key)
          const existingTitles = activities.filter(a => a.category === cat.key).map(a => a.title)
          const available = catSuggestions.filter(s => !existingTitles.includes(s.title))
          if (available.length === 0) return null
          return (
            <div key={cat.key} className="mb-4">
              <p className="text-[11px] font-semibold text-gray-400 mb-2">{cat.label}</p>
              <div className="flex flex-wrap gap-2">
                {available.map(s => (
                  <button
                    key={s.title}
                    onClick={() => handleSuggestion(s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-white/40 dark:border-white/5 text-sm font-medium hover:bg-white/80 dark:hover:bg-white/5 transition-all active:scale-95"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Slett aktivitet"
        message={`Slette "${deleteTarget?.title ?? ''}"?`}
        onConfirm={() => { if (deleteId) deleteActivity(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

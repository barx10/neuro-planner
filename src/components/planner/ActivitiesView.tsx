import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { useActivityStore } from '../../store/activityStore'
import type { ActivityCategory } from '../../types'
import { EmojiPicker } from '../ui/EmojiPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'

const CATEGORIES: { key: ActivityCategory; label: string; description: string }[] = [
  { key: 'arbeid', label: 'Arbeid', description: 'Jobb, skole, prosjekter' },
  { key: 'husholdning', label: 'Husholdning', description: 'Vaske, rydde, handle' },
  { key: 'behov', label: 'Behov', description: 'Spise, hvile, trening' },
]

const SUGGESTIONS: { title: string; emoji: string; category: ActivityCategory }[] = [
  // Arbeid
  { title: 'Lekser', emoji: '\u{1F4DA}', category: 'arbeid' },
  { title: 'M\u00F8te', emoji: '\u{1F4CB}', category: 'arbeid' },
  { title: 'E-post', emoji: '\u{1F4E7}', category: 'arbeid' },
  { title: 'Prosjekt', emoji: '\u{1F3AF}', category: 'arbeid' },
  { title: 'Presentasjon', emoji: '\u{1F4CA}', category: 'arbeid' },
  { title: 'Lesing', emoji: '\u{1F4D6}', category: 'arbeid' },
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
  const [openSuggestions, setOpenSuggestions] = useState<ActivityCategory | null>(null)

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
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold leading-tight">Aktiviteter</h2>
        <p className="text-muted">Faste gjøremål du kan velge når du legger til oppgaver.</p>
      </div>

      {CATEGORIES.map(cat => {
        const catActivities = activities.filter(a => a.category === cat.key)
        const isAdding = formCategory === cat.key
        const suggestions = SUGGESTIONS.filter(
          s => s.category === cat.key && !catActivities.some(a => a.title === s.title)
        )
        return (
          <section key={cat.key} className="mb-8" aria-labelledby={`cat-${cat.key}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 id={`cat-${cat.key}`} className="font-semibold">{cat.label}</h3>
                <p className="text-sm text-subtle">{cat.description}</p>
              </div>
              <button
                onClick={() => setFormCategory(isAdding ? null : cat.key)}
                className="icon-btn -mr-3"
                aria-label={isAdding ? 'Avbryt' : `Legg til i ${cat.label}`}
                aria-expanded={isAdding}
              >
                {isAdding ? <X size={20} /> : <Plus size={20} />}
              </button>
            </div>

            {isAdding && (
              <div className="card p-3 mb-2 flex gap-2 items-center animate-fade-in">
                <EmojiPicker value={formEmoji} onChange={setFormEmoji} />
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Navn"
                  aria-label="Navn på aktivitet"
                  className="field flex-1 min-w-0"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                />
                <button onClick={handleAdd} disabled={!formTitle.trim()} className="btn-primary px-4">
                  Legg til
                </button>
              </div>
            )}

            {catActivities.length > 0 && (
              <ul className="card divide-y divide-line">
                {catActivities.map(activity => (
                  <li key={activity.id} className="flex items-center gap-3 pl-4 pr-1 min-h-[52px]">
                    <span aria-hidden>{activity.emoji}</span>
                    <span className="flex-1">{activity.title}</span>
                    <button
                      onClick={() => setDeleteId(activity.id)}
                      className="icon-btn"
                      aria-label={`Fjern ${activity.title}`}
                    >
                      <X size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {suggestions.length > 0 && (catActivities.length === 0 || openSuggestions === cat.key) && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s.title}
                      onClick={() => handleSuggestion(s)}
                      className="flex items-center gap-1.5 pl-2.5 pr-3 min-h-[40px] rounded-full border border-dashed border-subtle/60 text-sm text-muted hover:bg-sunken hover:text-ink transition-colors"
                    >
                      <Plus size={14} aria-hidden />
                      <span aria-hidden>{s.emoji}</span>
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {suggestions.length > 0 && catActivities.length > 0 && openSuggestions !== cat.key && (
              <button onClick={() => setOpenSuggestions(cat.key)} className="btn-ghost text-sm px-2 -ml-2 mt-1">
                Vis forslag ({suggestions.length})
              </button>
            )}
          </section>
        )
      })}

      <ConfirmDialog
        open={deleteId !== null}
        title="Fjern aktivitet"
        message={`Vil du fjerne «${deleteTarget?.title ?? ''}» fra listen?`}
        confirmLabel="Fjern"
        onConfirm={() => { if (deleteId) deleteActivity(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

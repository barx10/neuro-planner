import { db } from '../../db/database'
import { todayString } from '../../utils/timeHelpers'

const MOODS = [
  { level: 1 as const, emoji: '\u{1F629}', label: 'Veldig lav energi' },
  { level: 2 as const, emoji: '\u{1F614}', label: 'Lav energi' },
  { level: 3 as const, emoji: '\u{1F610}', label: 'Middels energi' },
  { level: 4 as const, emoji: '\u{1F60A}', label: 'God energi' },
  { level: 5 as const, emoji: '\u{1F929}', label: 'Topp energi' },
]

interface MoodSelectorProps {
  value?: number
  onChange: (level: 1 | 2 | 3 | 4 | 5) => void
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const handleSelect = async (level: 1 | 2 | 3 | 4 | 5) => {
    onChange(level)
    await db.moods.put({ date: todayString(), level })
  }

  return (
    <div className="max-w-lg mx-auto px-4 mt-4">
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold mb-3">
          Hvordan er energien din i dag?
        </p>
        <div className="flex justify-center gap-2">
          {MOODS.map(mood => (
            <button
              key={mood.level}
              type="button"
              onClick={() => handleSelect(mood.level)}
              className={`w-14 h-14 text-2xl rounded-2xl transition-all duration-200 flex items-center justify-center ${
                value === mood.level
                  ? 'bg-indigo-500/15 scale-110 ring-2 ring-indigo-500 shadow-lg'
                  : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:scale-110 active:scale-95'
              }`}
              aria-label={mood.label}
              title={mood.label}
            >
              {mood.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

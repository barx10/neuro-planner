import { db } from '../../db/database'
import { todayString } from '../../utils/timeHelpers'
import { MOODS } from '../../utils/moods'


interface MoodSelectorProps {
  value?: number
  bare?: boolean
  onChange: (level: 1 | 2 | 3 | 4 | 5) => void
}

export function MoodSelector({ value, bare, onChange }: MoodSelectorProps) {
  const handleSelect = async (level: 1 | 2 | 3 | 4 | 5) => {
    onChange(level)
    await db.moods.put({ date: todayString(), level })
  }

  return (
    <div className={bare ? '' : 'card px-4 py-3'}>
      <p className="text-sm font-medium text-muted mb-1.5" id="mood-label">
        Hvordan er energien i dag?
      </p>
      <div className="flex justify-between" role="radiogroup" aria-labelledby="mood-label">
        {MOODS.map(mood => {
          const selected = value === mood.level
          return (
            <button
              key={mood.level}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(mood.level)}
              className={`w-12 h-12 text-2xl rounded-full flex items-center justify-center transition-colors ${
                selected ? 'bg-accent-soft ring-2 ring-accent' : 'hover:bg-sunken'
              } ${value && !selected ? 'opacity-40' : ''}`}
              aria-label={`${mood.label} energi`}
              title={mood.label}
            >
              {mood.emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

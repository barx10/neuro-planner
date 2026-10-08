import { Check } from 'lucide-react'
import { TASK_COLORS } from '../../utils/colorHelpers'

const COLOR_NAMES: Record<string, string> = {
  '#e5484d': 'Rød',
  '#f2a33a': 'Rav',
  '#30a46c': 'Grønn',
  '#12a594': 'Blågrønn',
  '#3e63dd': 'Blå',
  '#6e56cf': 'Fiolett',
  '#d6409f': 'Rosa',
  '#8d8d86': 'Sand',
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-8" role="radiogroup" aria-label="Farge">
      {TASK_COLORS.map(color => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_NAMES[color] ?? color}
            onClick={() => onChange(color)}
            className="h-12 flex items-center justify-center rounded-full"
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-shadow ${
                selected ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink' : ''
              }`}
              style={{ backgroundColor: color }}
            >
              {selected && <Check size={16} className="text-white" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

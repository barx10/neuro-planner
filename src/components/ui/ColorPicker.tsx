import { TASK_COLORS } from '../../utils/colorHelpers'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {TASK_COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-9 h-9 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none ${
            value === color
              ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110'
              : ''
          }`}
          style={{
            backgroundColor: color,
            boxShadow: value === color ? `0 4px 15px -2px ${color}80` : 'none',
            ...(value === color ? { '--tw-ring-color': color } as React.CSSProperties : {}),
          }}
          aria-label={`Velg farge ${color}`}
        />
      ))}
    </div>
  )
}

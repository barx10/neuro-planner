import { useState } from 'react'

const EMOJI_OPTIONS = [
  '\u{1F4DA}', '\u270F\uFE0F', '\u{1F3E0}', '\u{1F3C3}', '\u{1F373}', '\u{1F4A7}',
  '\u{1F9F9}', '\u{1F6BF}', '\u{1F9B7}', '\u{1F455}', '\u{1F392}', '\u{1F4BB}',
  '\u{1F3B5}', '\u{1F3A8}', '\u26BD', '\u{1F6B4}', '\u{1F4F1}', '\u{1F634}',
  '\u23F0', '\u2615', '\u{1F966}', '\u{1F4AA}', '\u{1F9D8}', '\u{1F389}',
  '\u2B50', '\u2764\uFE0F', '\u{1F31F}', '\u{1F308}', '\u{1F525}', '\u{1F680}'
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-14 h-14 text-2xl rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-indigo-300 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label="Velg emoji"
      >
        {value || '\u2B50'}
      </button>
      {open && (
        <div className="absolute z-50 top-16 left-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-3 grid grid-cols-6 gap-1.5 w-[280px] animate-scale-in">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false) }}
              className="w-10 h-10 text-xl rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

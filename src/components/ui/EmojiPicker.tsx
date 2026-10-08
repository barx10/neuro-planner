import { useState, useEffect, useRef } from 'react'

const EMOJI_OPTIONS = [
  '\u{1F4DA}', '✏️', '\u{1F3E0}', '\u{1F3C3}', '\u{1F373}', '\u{1F4A7}',
  '\u{1F9F9}', '\u{1F6BF}', '\u{1F9B7}', '\u{1F455}', '\u{1F392}', '\u{1F4BB}',
  '\u{1F3B5}', '\u{1F3A8}', '⚽', '\u{1F6B4}', '\u{1F4F1}', '\u{1F634}',
  '⏰', '☕', '\u{1F966}', '\u{1F4AA}', '\u{1F9D8}', '\u{1F389}',
  '⭐', '❤️', '\u{1F31F}', '\u{1F308}', '\u{1F525}', '\u{1F680}'
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-[52px] h-[52px] text-2xl rounded-xl border border-line bg-surface hover:bg-sunken transition-colors flex items-center justify-center"
        aria-label="Velg symbol"
        aria-expanded={open}
      >
        {value || '⭐'}
      </button>
      {open && (
        <div className="absolute z-50 top-[60px] left-0 bg-surface rounded-2xl shadow-xl border border-line p-2 grid grid-cols-6 gap-1 w-[296px] animate-fade-in">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false) }}
              className={`w-11 h-11 text-xl rounded-xl hover:bg-sunken transition-colors flex items-center justify-center ${
                value === emoji ? 'bg-accent-soft' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

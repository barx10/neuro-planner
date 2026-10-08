import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

// Felles ark for skjema og paneler: glir opp nedenfra på mobil, sentrert på større skjermer.
export function Sheet({ title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl animate-sheet-up flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pl-6 pr-3 pt-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Lukk">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 pb-6 pt-2 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-line">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Slett', onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-fade-in" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-surface rounded-3xl p-6 mx-4 max-w-sm w-full shadow-xl animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-muted text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1" autoFocus>
            Avbryt
          </button>
          <button onClick={onConfirm} className="btn flex-1 bg-danger text-white hover:bg-danger/90 dark:text-bg">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

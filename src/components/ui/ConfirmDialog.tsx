interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all min-h-[48px] active:scale-95"
          >
            Avbryt
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-all min-h-[48px] active:scale-95 shadow-lg shadow-red-500/25"
          >
            Slett
          </button>
        </div>
      </div>
    </div>
  )
}

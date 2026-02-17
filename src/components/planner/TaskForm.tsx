import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTaskStore } from '../../store/taskStore'
import { useActivityStore } from '../../store/activityStore'
import { ColorPicker } from '../ui/ColorPicker'
import { EmojiPicker } from '../ui/EmojiPicker'
import { TASK_COLORS } from '../../utils/colorHelpers'

interface TaskFormProps {
  date: string
  defaultTime?: string
  onClose: () => void
}

export function TaskForm({ date, defaultTime, onClose }: TaskFormProps) {
  const { addTask, tasks } = useTaskStore()
  const { activities, loadActivities } = useActivityStore()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('\u2B50')
  const [color, setColor] = useState(TASK_COLORS[4])
  const [startTime, setStartTime] = useState(defaultTime ?? '09:00')
  const [duration, setDuration] = useState(30)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (activities.length === 0) loadActivities()
  }, [activities.length, loadActivities])

  const selectActivity = (act: { title: string; emoji: string }) => {
    setTitle(act.title)
    setEmoji(act.emoji)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await addTask({
      title: title.trim(),
      emoji,
      color,
      startTime,
      durationMinutes: duration,
      date,
      completed: false,
      subtasks: [],
      order: tasks.length,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Ny oppgave</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[48px] min-h-[48px] flex items-center justify-center transition-all active:scale-90"
            aria-label="Lukk"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {activities.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Hurtigvalg</label>
              <div className="flex flex-wrap gap-1.5">
                {activities.map(act => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => selectActivity(act)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                      title === act.title
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{act.emoji}</span>
                    <span>{act.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 items-start">
            <EmojiPicker value={emoji} onChange={setEmoji} />
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Hva skal du gjøre?"
              className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Farge</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Starttid</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Varighet</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 time</option>
                <option value={90}>1.5 timer</option>
                <option value={120}>2 timer</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="w-full py-3.5 btn-primary min-h-[52px] text-[15px]"
          >
            {saving ? 'Lagrer...' : 'Legg til oppgave'}
          </button>
        </form>
      </div>
    </div>
  )
}

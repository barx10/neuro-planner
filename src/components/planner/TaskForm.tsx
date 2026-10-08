import { useState, useEffect } from 'react'
import { Trash2, X, Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { Task, Subtask } from '../../types'
import { useTaskStore } from '../../store/taskStore'
import { useActivityStore } from '../../store/activityStore'
import { ColorPicker } from '../ui/ColorPicker'
import { EmojiPicker } from '../ui/EmojiPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Sheet } from '../ui/Sheet'
import { TaskBreakdown } from '../ai/TaskBreakdown'
import { TASK_COLORS } from '../../utils/colorHelpers'
import { formatDuration } from '../../utils/timeHelpers'

const DURATIONS = [10, 15, 30, 45, 60, 90]

interface TaskFormProps {
  date: string
  defaultTime?: string
  task?: Task
  onClose: () => void
}

// Ett skjema for både ny og eksisterende oppgave.
export function TaskForm({ date, defaultTime, task, onClose }: TaskFormProps) {
  const { addTask, updateTask, deleteTask, tasks } = useTaskStore()
  const { activities, loadActivities } = useActivityStore()
  const [title, setTitle] = useState(task?.title ?? '')
  const [emoji, setEmoji] = useState(task?.emoji ?? '⭐')
  const [color, setColor] = useState(task?.color ?? TASK_COLORS[4])
  const [startTime, setStartTime] = useState(task?.startTime ?? defaultTime ?? '09:00')
  const [duration, setDuration] = useState(task?.durationMinutes ?? 30)
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? [])
  const [newSubtask, setNewSubtask] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEdit = !!task
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b)

  useEffect(() => {
    if (!isEdit && activities.length === 0) loadActivities()
  }, [isEdit, activities.length, loadActivities])

  const addSubtask = () => {
    const t = newSubtask.trim()
    if (!t) return
    setSubtasks(prev => [...prev, { id: nanoid(), title: t, completed: false }])
    setNewSubtask('')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const fields = { title: title.trim(), emoji, color, startTime, durationMinutes: duration, subtasks }
    if (task) {
      await updateTask(task.id, fields)
    } else {
      await addTask({ ...fields, date, completed: false, order: tasks.length })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Sheet
      title={isEdit ? 'Rediger oppgave' : 'Ny oppgave'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {isEdit && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-secondary px-3" aria-label="Slett oppgave">
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!title.trim() || saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Lagrer …' : isEdit ? 'Lagre' : 'Legg til'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEdit && activities.length > 0 && (
          <div>
            <p className="label mb-2">Hurtigvalg</p>
            <div className="flex flex-wrap gap-2">
              {activities.map(act => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => { setTitle(act.title); setEmoji(act.emoji) }}
                  className={`flex items-center gap-1.5 px-3 min-h-[40px] rounded-full text-sm font-medium border transition-colors ${
                    title === act.title
                      ? 'bg-accent-soft border-accent text-ink'
                      : 'border-line text-muted hover:bg-sunken'
                  }`}
                >
                  <span aria-hidden>{act.emoji}</span>
                  {act.title}
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
            aria-label="Tittel"
            className="field flex-1 min-h-[52px] text-base font-medium"
            autoFocus={!isEdit}
          />
        </div>

        <label className="block">
          <span className="label mb-2 block">Starttid</span>
          <input
            type="time"
            value={startTime}
            onChange={e => e.target.value && setStartTime(e.target.value)}
            className="field tabular max-w-[160px]"
          />
        </label>

        <div>
          <p className="label mb-2">Varighet</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Varighet">
            {durations.map(m => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={duration === m}
                onClick={() => setDuration(m)}
                className={`min-h-[44px] rounded-xl text-sm font-medium border transition-colors tabular ${
                  duration === m
                    ? 'bg-ink text-bg border-ink'
                    : 'border-line text-muted hover:bg-sunken'
                }`}
              >
                {formatDuration(m)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-1">Farge</p>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div>
          <p className="label mb-2">Delsteg</p>
          {subtasks.length > 0 && (
            <ul className="mb-2 divide-y divide-line border border-line rounded-xl">
              {subtasks.map(s => (
                <li key={s.id} className="flex items-center pl-4 pr-1 min-h-[48px]">
                  <span className={`flex-1 text-sm ${s.completed ? 'line-through text-subtle' : ''}`}>{s.title}</span>
                  <button
                    type="button"
                    onClick={() => setSubtasks(prev => prev.filter(x => x.id !== s.id))}
                    className="icon-btn"
                    aria-label={`Fjern ${s.title}`}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
              placeholder="Legg til et steg"
              aria-label="Nytt delsteg"
              className="field flex-1 text-sm"
            />
            <button type="button" onClick={addSubtask} disabled={!newSubtask.trim()} className="btn-secondary px-3" aria-label="Legg til steg">
              <Plus size={18} />
            </button>
          </div>
          {title.trim() && subtasks.length === 0 && (
            <TaskBreakdown
              taskTitle={title.trim()}
              onApply={steps => setSubtasks(steps.map(t => ({ id: nanoid(), title: t, completed: false })))}
            />
          )}
        </div>
      </form>

      {task && (
        <ConfirmDialog
          open={confirmDelete}
          title="Slett oppgave"
          message={`Vil du slette «${task.title}»?`}
          onConfirm={async () => { await deleteTask(task.id); setConfirmDelete(false); onClose() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Sheet>
  )
}

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Trash2, Play, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import type { Task } from '../../types'
import { useTaskStore } from '../../store/taskStore'
import { getEndTime, formatDuration } from '../../utils/timeHelpers'
import { hexToRgba } from '../../utils/colorHelpers'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface TaskCardProps {
  task: Task
  isNow?: boolean
  timeStatus?: { type: 'starts-in' | 'in-progress'; minutes: number }
  onStartTimer: (task: Task) => void
}

export function TaskCard({ task, isNow, timeStatus, onStartTimer }: TaskCardProps) {
  const { toggleComplete, deleteTask, updateTask } = useTaskStore()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleToggleComplete = async () => {
    if (!task.completed) {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 600)
    }
    await toggleComplete(task.id)
  }

  const handleToggleSubtask = async (subtaskId: string) => {
    const subtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )
    await updateTask(task.id, { subtasks })
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={`animate-slide-up rounded-2xl p-4 mb-3 card-hover border ${
          isNow && !task.completed
            ? 'border-2 animate-pulse-soft'
            : 'border border-white/40 dark:border-white/5'
        } ${isDragging ? 'opacity-50 scale-[1.02] shadow-2xl z-50' : ''
        } ${task.completed ? 'opacity-50' : ''} ${justCompleted ? 'animate-confetti' : ''}`}
        style={{
          ...style,
          borderColor: isNow && !task.completed ? task.color : undefined,
          background: isNow && !task.completed
            ? `linear-gradient(135deg, ${hexToRgba(task.color, 0.15)}, ${hexToRgba(task.color, 0.06)})`
            : `linear-gradient(135deg, ${hexToRgba(task.color, 0.08)}, ${hexToRgba(task.color, 0.03)})`,
          boxShadow: isDragging
            ? `0 20px 60px -10px ${hexToRgba(task.color, 0.3)}`
            : isNow && !task.completed
              ? `0 4px 20px -4px ${hexToRgba(task.color, 0.35)}`
              : `0 2px 12px -4px ${hexToRgba(task.color, 0.15)}`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 touch-none transition-colors"
            aria-label="Dra for å endre rekkefølge"
          >
            <GripVertical size={18} />
          </div>

          {/* Checkbox */}
          <button
            onClick={handleToggleComplete}
            className="relative w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 min-w-[44px] min-h-[44px] -m-2"
            style={{
              borderColor: task.completed ? '#22c55e' : hexToRgba(task.color, 0.4),
              backgroundColor: task.completed ? '#22c55e' : 'transparent',
            }}
            aria-label={task.completed ? 'Marker som ikke fullført' : 'Marker som fullført'}
          >
            {task.completed && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0 ml-1">
            {/* Title row */}
            <div className="flex items-center gap-1.5">
              <span className="text-lg drop-shadow-sm">{task.emoji}</span>
              <span className={`font-semibold text-[15px] truncate flex-1 ${task.completed ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </span>
              {task.subtasks.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-all duration-200 flex-shrink-0"
                  aria-label={expanded ? 'Skjul delsteg' : 'Vis delsteg'}
                >
                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
              {task.durationMinutes >= 25 && <span className="text-[13px] flex-shrink-0">🍅</span>}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isNow && !task.completed && (
                <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full animate-pulse-soft" style={{ backgroundColor: task.color }}>
                  Nå
                </span>
              )}
              {!task.completed && timeStatus && timeStatus.type === 'starts-in' && timeStatus.minutes <= 30 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: hexToRgba(task.color, 0.12), color: task.color }}>
                  om {timeStatus.minutes} min
                </span>
              )}
              {!task.completed && timeStatus && timeStatus.type === 'in-progress' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                  {timeStatus.minutes} min igjen
                </span>
              )}
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: hexToRgba(task.color, 0.12),
                  color: task.color,
                }}
              >
                {task.startTime} – {getEndTime(task.startTime, task.durationMinutes)}
              </span>
              <span className="text-[11px] text-gray-400">{formatDuration(task.durationMinutes)}</span>
            </div>
          </div>

          {/* Actions: play + delete only */}
          <div className="flex items-center gap-0.5">
            {!task.completed && (
              <button
                onClick={() => onStartTimer(task)}
                className="p-2 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center hover:scale-110 active:scale-95"
                style={{ color: task.color }}
                aria-label="Start tidtaker"
              >
                <Play size={18} fill="currentColor" />
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-xl text-gray-300 hover:text-red-500 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-500/10"
              aria-label="Slett oppgave"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Subtasks */}
        {expanded && task.subtasks.length > 0 && (
          <div className="mt-3 ml-12 space-y-2 animate-slide-down">
            {task.subtasks.map(sub => (
              <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                  sub.completed
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                }`}>
                  {sub.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => handleToggleSubtask(sub.id)}
                  className="sr-only"
                />
                <span className={`text-sm transition-colors ${sub.completed ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {sub.title}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Slett oppgave"
        message={`Er du sikker på at du vil slette "${task.title}"?`}
        onConfirm={() => { deleteTask(task.id); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

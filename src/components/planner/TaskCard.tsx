import { useState } from 'react'
import { Check, Play, ChevronDown } from 'lucide-react'
import type { Task } from '../../types'
import { useTaskStore } from '../../store/taskStore'
import { formatDuration } from '../../utils/timeHelpers'

export type TimeStatus = { type: 'starts-in' | 'in-progress'; minutes: number }

interface TaskCardProps {
  task: Task
  timeStatus?: TimeStatus
  onStartTimer: (task: Task) => void
  onEdit: (task: Task) => void
}

export function TaskCard({ task, timeStatus, onStartTimer, onEdit }: TaskCardProps) {
  const { toggleComplete, updateTask } = useTaskStore()
  const [expanded, setExpanded] = useState(false)

  const isNow = timeStatus?.type === 'in-progress' && !task.completed
  const doneSteps = task.subtasks.filter(s => s.completed).length

  const toggleSubtask = (id: string) =>
    updateTask(task.id, {
      subtasks: task.subtasks.map(s => (s.id === id ? { ...s, completed: !s.completed } : s)),
    })

  return (
    <li className="flex gap-3">
      {/* Tidskolonne */}
      <div className="w-12 shrink-0 pt-4 text-right">
        <p className={`text-sm font-semibold tabular ${task.completed ? 'text-subtle' : 'text-ink'}`}>{task.startTime}</p>
      </div>

      <div
        className={`flex-1 min-w-0 card overflow-hidden transition-colors ${
          isNow ? 'border-accent ring-1 ring-accent' : ''
        }`}
      >
        <div className="flex items-stretch">
          <span className="w-1 shrink-0" style={{ backgroundColor: task.color, opacity: task.completed ? 0.35 : 1 }} aria-hidden />

          <button
            onClick={() => toggleComplete(task.id)}
            className="w-12 shrink-0 flex items-center justify-center"
            aria-label={task.completed ? `Marker «${task.title}» som ikke gjort` : `Marker «${task.title}» som gjort`}
          >
            <span
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.completed ? 'bg-success border-success' : 'border-subtle hover:border-ink'
              }`}
            >
              {task.completed && <Check size={14} className="text-white dark:text-bg" strokeWidth={3} />}
            </span>
          </button>

          <button
            onClick={() => onEdit(task)}
            className="flex-1 min-w-0 py-3 pr-2 text-left"
            aria-label={`Rediger «${task.title}»`}
          >
            <span className={`flex items-start gap-2 font-medium leading-snug ${task.completed ? 'line-through text-subtle' : ''}`}>
              <span aria-hidden className="shrink-0">{task.emoji}</span>
              <span className="line-clamp-2">{task.title}</span>
            </span>
            <span className="flex items-center gap-x-2 mt-0.5 text-sm text-subtle tabular">
              {isNow ? (
                <span className="font-semibold text-accent">Nå · {timeStatus!.minutes} min igjen</span>
              ) : timeStatus?.type === 'starts-in' && !task.completed ? (
                <span className="font-medium text-muted">Om {timeStatus.minutes} min</span>
              ) : (
                <span>{formatDuration(task.durationMinutes)}</span>
              )}
            </span>
          </button>

          {!task.completed && (
            <button
              onClick={() => onStartTimer(task)}
              className="w-12 shrink-0 flex items-center justify-center text-muted hover:text-ink transition-colors"
              aria-label={`Start tidtaker for «${task.title}»`}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center ${isNow ? 'bg-accent text-on-accent' : 'bg-sunken'}`}>
                <Play size={15} fill="currentColor" className="ml-0.5" />
              </span>
            </button>
          )}
        </div>

        {task.subtasks.length > 0 && (
          <div className="border-t border-line">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center gap-2 pl-[52px] pr-4 min-h-[40px] text-sm text-muted hover:text-ink"
              aria-expanded={expanded}
            >
              <span className="tabular">{doneSteps} av {task.subtasks.length} steg</span>
              <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <ul className="pb-2">
                {task.subtasks.map(sub => (
                  <li key={sub.id}>
                    <label className="flex items-center gap-3 pl-[52px] pr-4 min-h-[40px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => toggleSubtask(sub.id)}
                        className="w-4 h-4 accent-[rgb(var(--success))]"
                      />
                      <span className={`text-sm ${sub.completed ? 'line-through text-subtle' : ''}`}>{sub.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { breakdownTask } from '../../hooks/useAi'
import { useTaskStore } from '../../store/taskStore'
import { nanoid } from 'nanoid'

interface TaskBreakdownProps {
  taskId: string
  taskTitle: string
}

export function TaskBreakdown({ taskId, taskTitle }: TaskBreakdownProps) {
  const [steps, setSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { updateTask } = useTaskStore()

  const handleBreakdown = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await breakdownTask(taskTitle)
      setSteps(result)
    } catch {
      setError('Kunne ikke bryte ned oppgaven. Sjekk API-nøkkelen.')
    }
    setLoading(false)
  }

  const handleApply = async () => {
    const subtasks = steps.map(s => ({
      id: nanoid(),
      title: s,
      completed: false,
    }))
    await updateTask(taskId, { subtasks })
    setSteps([])
  }

  return (
    <div>
      {steps.length === 0 ? (
        <button
          onClick={handleBreakdown}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600 transition-colors disabled:opacity-50 min-h-[48px]"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? 'Bryter ned...' : 'AI: Bryt ned oppgaven'}
        </button>
      ) : (
        <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
            AI-forslag til delsteg:
          </p>
          <ol className="space-y-1 text-sm list-decimal list-inside">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApply}
              className="text-sm px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors min-h-[48px]"
            >
              Bruk disse
            </button>
            <button
              onClick={() => setSteps([])}
              className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700 min-h-[48px]"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}

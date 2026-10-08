import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { breakdownTask } from '../../hooks/useAi'

interface TaskBreakdownProps {
  taskTitle: string
  onApply: (steps: string[]) => void
}

export function TaskBreakdown({ taskTitle, onApply }: TaskBreakdownProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBreakdown = async () => {
    setLoading(true)
    setError('')
    try {
      onApply(await breakdownTask(taskTitle))
    } catch {
      setError('Fikk ikke delt opp oppgaven. Sjekk API-nøkkelen under Innstillinger.')
    }
    setLoading(false)
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleBreakdown}
        disabled={loading}
        className="btn-ghost px-2 -ml-2 text-accent hover:text-accent"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Deler opp …' : 'Del opp med AI'}
      </button>
      {error && <p role="alert" className="text-sm text-danger mt-1">{error}</p>}
    </div>
  )
}

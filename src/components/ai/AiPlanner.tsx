import { useState } from 'react'
import { Sparkles, Loader2, Plus, Check } from 'lucide-react'
import { generateDayPlan } from '../../hooks/useAi'
import { useTaskStore } from '../../store/taskStore'
import { TASK_COLORS, hexToRgba } from '../../utils/colorHelpers'

interface AiPlannerProps {
  date: string
}

export function AiPlanner({ date }: AiPlannerProps) {
  const [input, setInput] = useState('')
  const [plan, setPlan] = useState<Array<{
    title: string
    emoji: string
    startTime: string
    durationMinutes: number
  }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const { addTask, tasks } = useTaskStore()

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await generateDayPlan(input)
      setPlan(result)
    } catch {
      setError('Kunne ikke lage plan. Sjekk API-nøkkelen i innstillinger.')
    }
    setLoading(false)
  }

  const handleApply = async () => {
    setLoading(true)
    for (let i = 0; i < plan.length; i++) {
      const item = plan[i]
      await addTask({
        title: item.title,
        emoji: item.emoji,
        color: TASK_COLORS[i % TASK_COLORS.length],
        startTime: item.startTime,
        durationMinutes: item.durationMinutes,
        date,
        completed: false,
        subtasks: [],
        order: tasks.length + i,
      })
    }
    setApplied(true)
    setLoading(false)
    setTimeout(() => {
      setPlan([])
      setInput('')
      setApplied(false)
    }, 2000)
  }

  return (
    <div className="glass rounded-2xl p-4 mb-5 animate-fade-in">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Sparkles size={16} className="text-indigo-500" />
        </div>
        <h3 className="font-bold text-sm">AI-planlegger</h3>
      </div>

      {applied ? (
        <div className="flex items-center gap-2 text-green-500 py-2 animate-fade-in">
          <Check size={18} />
          <span className="text-sm font-semibold">{plan.length} oppgaver lagt til!</span>
        </div>
      ) : (
        <>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Beskriv dagen din, så lager AI en plan..."
            rows={2}
            className="w-full px-3.5 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
            className="w-full mt-2.5 py-3 btn-primary min-h-[48px] flex items-center justify-center gap-2 text-sm"
          >
            {loading && !plan.length ? (
              <><Loader2 size={16} className="animate-spin" /> Lager plan...</>
            ) : (
              <><Sparkles size={16} /> Lag dagplan</>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-500 mt-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">{error}</p>
          )}

          {plan.length > 0 && (
            <div className="mt-3 space-y-2 animate-slide-up">
              {plan.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/40 dark:border-white/5 animate-slide-up"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(TASK_COLORS[i % TASK_COLORS.length], 0.08)}, transparent)`,
                    animationDelay: `${i * 60}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {item.startTime} ({item.durationMinutes} min)
                    </p>
                  </div>
                </div>
              ))}
              <button
                onClick={handleApply}
                disabled={loading}
                className="w-full mt-1 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50 transition-all min-h-[48px] flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/25 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Legg til alle
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

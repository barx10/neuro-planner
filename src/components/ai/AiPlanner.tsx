import { useState } from 'react'
import { Sparkles, Loader2, Plus, Check, Clock, Pencil, Brain } from 'lucide-react'
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
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const updatePlanItem = (index: number, field: 'startTime' | 'durationMinutes', value: string | number) => {
    setPlan(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  const { addTask, tasks } = useTaskStore()

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await generateDayPlan(input)
      setPlan(result.tasks)
      setAnalysis(result.analysis)
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
      setAnalysis('')
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
              {analysis && (
                <div className="flex gap-2.5 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 animate-fade-in">
                  <Brain size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{analysis}</p>
                </div>
              )}
              {plan.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/40 dark:border-white/5 animate-slide-up overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(TASK_COLORS[i % TASK_COLORS.length], 0.08)}, transparent)`,
                    animationDelay: `${i * 60}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      <p className="text-[11px] text-gray-400">
                        {item.startTime} · {item.durationMinutes} min
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      aria-label="Endre tid"
                    >
                      {editingIndex === i ? <Check size={14} className="text-green-500" /> : <Pencil size={14} className="text-gray-400" />}
                    </button>
                  </div>
                  {editingIndex === i && (
                    <div className="flex items-center gap-3 px-3 pb-3 pt-0 animate-fade-in">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        <input
                          type="time"
                          value={item.startTime}
                          onChange={e => updatePlanItem(i, 'startTime', e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-400">Varighet</span>
                        <select
                          value={item.durationMinutes}
                          onChange={e => updatePlanItem(i, 'durationMinutes', Number(e.target.value))}
                          className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map(m => (
                            <option key={m} value={m}>{m} min</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
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

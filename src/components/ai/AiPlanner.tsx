import { useState } from 'react'
import { Sparkles, Loader2, Check, Pencil } from 'lucide-react'
import { generateDayPlan } from '../../hooks/useAi'
import { useTaskStore } from '../../store/taskStore'
import { TASK_COLORS } from '../../utils/colorHelpers'
import { useSettingsStore } from '../../store/settingsStore'
import { useDayOverride } from '../../hooks/useDayOverride'
import { getBlockedPeriodForDate, getEndTime } from '../../utils/timeHelpers'
import { Sheet } from '../ui/Sheet'
import { VoiceButton } from './VoiceButton'

interface AiPlannerProps {
  date: string
  onClose: () => void
}

type PlanItem = { title: string; emoji: string; startTime: string; durationMinutes: number }

export function AiPlanner({ date, onClose }: AiPlannerProps) {
  const [input, setInput] = useState('')
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const { addTask, tasks } = useTaskStore()
  const { settings } = useSettingsStore()
  const { override } = useDayOverride(date)
  const blockedPeriod = getBlockedPeriodForDate(date, settings.weeklySchedule, override)
  const hasKey = !!settings.apiKeys[settings.aiProvider]

  const updatePlanItem = (index: number, field: 'startTime' | 'durationMinutes', value: string | number) => {
    setPlan(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await generateDayPlan(input, blockedPeriod)
      setPlan(result.tasks)
      setAnalysis(result.analysis)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ukjent feil'
      setError(msg)
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
    setLoading(false)
    setApplied(true)
    setTimeout(onClose, 1200)
  }

  const footer = applied ? (
    <p className="flex items-center justify-center gap-2 min-h-[48px] font-semibold text-success" role="status">
      <Check size={18} /> {plan.length} oppgaver lagt til
    </p>
  ) : plan.length > 0 ? (
    <div className="flex gap-3">
      <button onClick={() => { setPlan([]); setAnalysis('') }} className="btn-secondary" disabled={loading}>
        Prøv igjen
      </button>
      <button onClick={handleApply} disabled={loading} className="btn-primary flex-1">
        {loading && <Loader2 size={16} className="animate-spin" />}
        Legg til {plan.length} oppgaver
      </button>
    </div>
  ) : (
    <button onClick={handleGenerate} disabled={loading || !input.trim() || !hasKey} className="btn-primary w-full">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
      {loading ? 'Lager plan …' : 'Lag plan'}
    </button>
  )

  return (
    <Sheet title="Planlegg med AI" onClose={onClose} footer={footer}>
      {plan.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Fortell eller skriv hva du skal eller må gjøre. Du får et forslag med tider og pauser som du kan justere før det legges inn.
          </p>
          {blockedPeriod && (
            <p className="text-sm text-muted">
              Opptatt {blockedPeriod.start}–{blockedPeriod.end} ({blockedPeriod.label}). Planen legges utenom.
            </p>
          )}
          <VoiceButton onText={text => setInput(prev => (prev.trim() ? `${prev.trim()} ${text}` : text))} />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="F.eks. lekser i matte, rydde rommet, trene, ringe bestemor"
            rows={4}
            aria-label="Beskriv dagen"
            className="field resize-none"
            autoFocus={window.matchMedia('(pointer: fine)').matches}
          />
          {!hasKey && (
            <p className="text-sm text-muted">Legg inn en API-nøkkel under Innstillinger for å bruke AI.</p>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {analysis && <p className="text-sm text-muted leading-relaxed">{analysis}</p>}
          <ul className="divide-y divide-line border border-line rounded-2xl">
            {plan.map((item, i) => (
              <li key={i}>
                <div className="flex items-center gap-3 pl-4 pr-1 py-2">
                  <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: TASK_COLORS[i % TASK_COLORS.length] }} aria-hidden />
                  <span aria-hidden>{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-sm text-subtle tabular">
                      {item.startTime}–{getEndTime(item.startTime, item.durationMinutes)}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                    className="icon-btn"
                    aria-label={editingIndex === i ? 'Ferdig' : `Endre tid for ${item.title}`}
                  >
                    {editingIndex === i ? <Check size={16} /> : <Pencil size={16} />}
                  </button>
                </div>
                {editingIndex === i && (
                  <div className="flex gap-3 px-4 pb-3">
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={e => e.target.value && updatePlanItem(i, 'startTime', e.target.value)}
                      aria-label="Starttid"
                      className="field py-2 text-sm tabular"
                    />
                    <select
                      value={item.durationMinutes}
                      onChange={e => updatePlanItem(i, 'durationMinutes', Number(e.target.value))}
                      aria-label="Varighet"
                      className="field py-2 text-sm"
                    >
                      {[...new Set([5, 10, 15, 20, 25, 30, 45, 60, 90, 120, item.durationMinutes])].sort((a, b) => a - b).map(m => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  )
}

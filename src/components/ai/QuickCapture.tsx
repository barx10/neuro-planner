import { useState, useRef } from 'react'
import { Mic, Square, Loader2, Check, CalendarPlus, Keyboard } from 'lucide-react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { parseAppointments, transcriptionProvider, type ParsedAppointment } from '../../hooks/useAi'
import { useTaskStore } from '../../store/taskStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TASK_COLORS } from '../../utils/colorHelpers'
import { parseDate, getEndTime } from '../../utils/timeHelpers'
import { downloadIcs, googleCalendarUrl } from '../../utils/calendar'
import { Sheet } from '../ui/Sheet'
import { speak, stopSpeaking } from '../../hooks/useSpeech'
import { useSpeechRecognition, speechRecognitionSupported } from '../../hooks/useSpeechRecognition'
import { parseAppointmentLocally } from '../../utils/parseAppointment'

type Phase = 'recording' | 'typing' | 'thinking' | 'review' | 'saved'

const REMINDERS = [0, 5, 10, 15, 30, 60, 120]
const reminderLabel = (m: number) => (m === 0 ? 'Ingen' : m < 60 ? `${m} min før` : `${m / 60} t før`)
const dayLabel = (date: string) => format(parseDate(date), 'EEEE d. MMMM', { locale: nb })
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

type Item = ParsedAppointment & { startTime: string | null }

// Det appen forstod, lest opp så brukeren kan høre om det stemmer
function spokenSummary(items: Item[]): string {
  const parts = items.map(it =>
    `${it.title} ${dayLabel(it.date)}${it.startTime ? ` klokken ${it.startTime}` : ''}`
  )
  const missingTime = items.some(it => !it.startTime)
  return `Jeg fant ${parts.join(', og ')}.${missingTime ? ' Velg tid før du legger det til.' : ' Stemmer det?'}`
}

// Fast mikrofonknapp: si en avtale, se over og legg den inn på riktig dag.
export function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('recording')
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  // Det talegjenkjenningen hørte, vist mens AI tolker
  const [heard, setHeard] = useState('')
  const cancelled = useRef(false)
  const recorder = useVoiceRecorder({ stopOnSilenceMs: 1600 })
  const speech = useSpeechRecognition()
  // Telefonens talegjenkjenning brukes når den finnes. Virker den ikke, tas lyden opp og sendes til AI.
  const [nativeFailed, setNativeFailed] = useState(false)
  const { addTask } = useTaskStore()
  const { settings } = useSettingsStore()

  const nativeVoice = speechRecognitionSupported() && !nativeFailed
  const hasVoice = nativeVoice || transcriptionProvider() !== null
  const hasTextAi = !!settings.apiKeys[settings.aiProvider]

  const interpret = async (input: { text: string } | { audio: Blob }, spoken = 'audio' in input) => {
    setError('')
    setHeard(spoken && 'text' in input ? input.text : '')
    // Vanlige beskjeder tolkes rett i appen, uten å vente på AI
    const local = 'text' in input ? parseAppointmentLocally(input.text) : null
    if (local) {
      setItems([local])
      setPhase('review')
      if (spoken) speak(spokenSummary([local]))
      return
    }
    if ('text' in input && !hasTextAi) {
      setText(input.text)
      setError('Fant ikke dag og tid. Rett beskjeden, eller legg inn en API-nøkkel under Innstillinger så AI kan tolke den.')
      setPhase('typing')
      return
    }
    setPhase('thinking')
    try {
      const result = await parseAppointments(input)
      if (cancelled.current) return
      if (result.items.length === 0) {
        setError(result.heard === '' ? 'Hørte ikke noe tale. Prøv igjen, litt nærmere mikrofonen.' : 'Fant ingen avtale i beskjeden. Prøv å si hva og når.')
        if (result.heard) setText(result.heard)
        else if ('text' in input) setText(input.text)
        setPhase('typing')
        return
      }
      setItems(result.items)
      setPhase('review')
      if (spoken) speak(spokenSummary(result.items))
    } catch (err) {
      if (cancelled.current) return
      setError(err instanceof Error ? err.message : 'Noe gikk galt.')
      setPhase('typing')
    }
  }

  const startRecording = async () => {
    stopSpeaking()
    cancelled.current = false
    setError('')
    setPhase('recording')
    if (nativeVoice) {
      const outcome = await speech.start()
      if (cancelled.current) return
      if (outcome.ok) {
        if (outcome.text) interpret({ text: outcome.text }, true)
        else {
          setError('Hørte ikke noe tale. Prøv igjen, litt nærmere mikrofonen.')
          setPhase('typing')
        }
        return
      }
      if (outcome.reason === 'denied') {
        setError('Appen fikk ikke bruke mikrofonen. Gi tilgang i nettleseren og prøv igjen.')
        setPhase('typing')
        return
      }
      if (outcome.reason === 'aborted') return
      // Talegjenkjenningen virker ikke her. Bruk opptak og AI hvis det finnes en nøkkel.
      setNativeFailed(true)
      if (transcriptionProvider() === null) {
        setError('Talegjenkjenning er ikke tilgjengelig. Skriv beskjeden i stedet.')
        setPhase('typing')
        return
      }
    }
    const audio = await recorder.start()
    if (cancelled.current) return
    if (audio) interpret({ audio })
    else setPhase('typing')
  }

  const openCapture = () => {
    setOpen(true)
    setItems([])
    setText('')
    if (hasVoice) startRecording()
    else {
      setPhase('typing')
      setError(hasTextAi ? '' : 'Legg inn en API-nøkkel under Innstillinger for å bruke dette.')
    }
  }

  const close = () => {
    cancelled.current = true
    stopSpeaking()
    speech.abort()
    if (recorder.state === 'recording') recorder.stop()
    setOpen(false)
  }

  const switchToTyping = () => {
    cancelled.current = true
    if (speech.transcript) setText(speech.transcript)
    speech.abort()
    if (recorder.state === 'recording') recorder.stop()
    setPhase('typing')
  }

  const update = (i: number, changes: Partial<Item>) =>
    setItems(prev => prev.map((it, j) => (j === i ? { ...it, ...changes } : it)))

  const save = async () => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      await addTask({
        title: it.title,
        emoji: it.emoji,
        color: TASK_COLORS[(4 + i) % TASK_COLORS.length],
        date: it.date,
        startTime: it.startTime!,
        durationMinutes: it.durationMinutes,
        reminderMinutes: it.reminderMinutes,
        completed: false,
        subtasks: [],
        order: 0,
      })
    }
    setPhase('saved')
  }

  const canSave = items.length > 0 && items.every(it => it.title.trim() && it.startTime)

  const footer =
    phase === 'review' ? (
      <div className="flex gap-3">
        <button onClick={hasVoice ? startRecording : () => setPhase('typing')} className="btn-secondary">
          Prøv igjen
        </button>
        <button onClick={save} disabled={!canSave} className="btn-primary flex-1">
          <Check size={18} /> Legg til
        </button>
      </div>
    ) : phase === 'saved' ? (
      <button onClick={close} className="btn-primary w-full">Ferdig</button>
    ) : phase === 'typing' ? (
      <div className="flex gap-3">
        {hasVoice && (
          <button onClick={startRecording} className="btn-secondary px-3" aria-label="Snakk i stedet">
            <Mic size={18} />
          </button>
        )}
        <button
          onClick={() => interpret({ text })}
          disabled={!text.trim() || !hasTextAi}
          className="btn-primary flex-1"
        >
          Tolk beskjeden
        </button>
      </div>
    ) : undefined

  return (
    <>
      <button
        onClick={openCapture}
        className="fixed z-40 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] w-14 h-14 rounded-full bg-accent text-on-accent shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
        aria-label="Snakk inn en avtale"
      >
        <Mic size={24} />
      </button>

      {open && (
        <Sheet title="Ny avtale" onClose={close} footer={footer}>
          {phase === 'recording' && (
            <div className="text-center py-4">
              {speech.transcript ? (
                <p className="font-medium mb-8 min-h-[3rem]" aria-live="polite">«{speech.transcript}»</p>
              ) : (
                <>
                  <p className="text-muted mb-1">Si hva og når, f.eks.</p>
                  <p className="font-medium mb-8">«Tannlegen halv tre på fredag»</p>
                </>
              )}
              <button
                onClick={() => (speech.listening ? speech.stop() : recorder.stop())}
                disabled={!speech.listening && recorder.state !== 'recording'}
                className="w-24 h-24 rounded-full bg-accent text-on-accent flex flex-col items-center justify-center mx-auto shadow-lg disabled:opacity-60"
                aria-label="Stopp opptak"
              >
                {speech.listening || recorder.state === 'recording' ? <Square size={28} fill="currentColor" /> : <Loader2 size={28} className="animate-spin" />}
              </button>
              <p className="text-sm text-subtle mt-4 tabular" aria-live="polite">
                {speech.listening ? 'Lytter · stopper selv når du tier' : recorder.state === 'recording' ? `Tar opp · ${fmt(recorder.seconds)} · stopper selv når du tier` : 'Starter mikrofonen …'}
              </p>
              {recorder.error && <p role="alert" className="text-sm text-danger mt-3">{recorder.error}</p>}
              <button onClick={switchToTyping} className="btn-ghost text-sm mt-4">
                <Keyboard size={16} /> Skriv i stedet
              </button>
            </div>
          )}

          {phase === 'thinking' && (
            <div className="text-center py-12" role="status">
              {heard && <p className="font-medium mb-3">«{heard}»</p>}
              <p className="flex items-center justify-center gap-2 text-muted">
                <Loader2 size={18} className="animate-spin" /> Forstår beskjeden …
              </p>
            </div>
          )}

          {phase === 'typing' && (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="F.eks. tannlege fredag 14:30"
                rows={3}
                aria-label="Beskjed"
                className="field resize-none"
                autoFocus={window.matchMedia('(pointer: fine)').matches}
              />
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Se over før det legges inn.</p>
              {items.map((it, i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>{it.emoji}</span>
                    <input
                      value={it.title}
                      onChange={e => update(i, { title: e.target.value })}
                      aria-label="Tittel"
                      className="field py-2 font-medium flex-1 min-w-0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-sm text-subtle block mb-1">Dag</span>
                      <input
                        type="date"
                        value={it.date}
                        onChange={e => e.target.value && update(i, { date: e.target.value })}
                        className="field py-2 text-sm"
                      />
                    </label>
                    <label>
                      <span className="text-sm text-subtle block mb-1">Tid</span>
                      <input
                        type="time"
                        value={it.startTime ?? ''}
                        onChange={e => update(i, { startTime: e.target.value || null })}
                        className={`field py-2 text-sm tabular ${it.startTime ? '' : 'ring-2 ring-accent'}`}
                      />
                    </label>
                  </div>
                  <p className="text-sm text-muted first-letter:uppercase">
                    {dayLabel(it.date)}
                    {it.startTime ? ` kl. ${it.startTime}–${getEndTime(it.startTime, it.durationMinutes)}` : ' · velg tid'}
                  </p>
                  <label className="block">
                    <span className="text-sm text-subtle block mb-1">Påminnelse</span>
                    <select
                      value={it.reminderMinutes}
                      onChange={e => update(i, { reminderMinutes: Number(e.target.value) })}
                      className="field py-2 text-sm"
                    >
                      {[...new Set([...REMINDERS, it.reminderMinutes])].sort((a, b) => a - b).map(m => (
                        <option key={m} value={m}>{reminderLabel(m)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>
          )}

          {phase === 'saved' && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 font-semibold text-success" role="status">
                <Check size={18} /> Lagt inn
              </p>
              <p className="text-sm text-muted">
                For en påminnelse du kan stole på, også når appen er lukket: legg avtalen i kalenderen på telefonen.
              </p>
              {items.map((it, i) => it.startTime && (
                <div key={i} className="card p-4">
                  <p className="font-medium">
                    <span aria-hidden className="mr-2">{it.emoji}</span>{it.title}
                  </p>
                  <p className="text-sm text-muted mb-3 first-letter:uppercase">
                    {dayLabel(it.date)} kl. {it.startTime} · {reminderLabel(it.reminderMinutes).toLowerCase()}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => downloadIcs({ ...it, startTime: it.startTime! })} className="btn-secondary flex-1 text-sm">
                      <CalendarPlus size={16} /> Legg i kalender
                    </button>
                    <a href={googleCalendarUrl({ ...it, startTime: it.startTime })} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
                      Google
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Sheet>
      )}
    </>
  )
}

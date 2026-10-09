import { useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { transcribeAudio, transcriptionProvider } from '../../hooks/useAi'

interface VoiceButtonProps {
  onText: (text: string) => void
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Ta opp tale, send den til AI-leverandøren og lever teksten tilbake til skjemaet.
export function VoiceButton({ onText }: VoiceButtonProps) {
  const { supported, state, seconds, error: micError, start, stop, maxSeconds } = useVoiceRecorder()
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState('')

  if (!supported) return null

  const hasProvider = transcriptionProvider() !== null

  const handleStart = async () => {
    setError('')
    const audio = await start()
    if (!audio) return
    setTranscribing(true)
    try {
      const text = await transcribeAudio(audio)
      if (text) onText(text)
      else setError('Hørte ikke noe tale. Prøv igjen, litt nærmere mikrofonen.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fikk ikke skrevet ned talen.')
    }
    setTranscribing(false)
  }

  const recording = state === 'recording'

  return (
    <div>
      {recording ? (
        <button onClick={() => stop()} className="btn-primary w-full">
          <Square size={14} fill="currentColor" />
          Stopp opptak <span className="tabular opacity-80">· {fmt(seconds)}</span>
        </button>
      ) : (
        <button onClick={handleStart} disabled={transcribing || !hasProvider} className="btn-secondary w-full">
          {transcribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
          {transcribing ? 'Skriver ned …' : 'Snakk inn'}
        </button>
      )}
      <p className="text-sm text-subtle mt-2" aria-live="polite">
        {recording
          ? `Snakk fritt. Trykk stopp når du er ferdig (maks ${maxSeconds / 60} min).`
          : !hasProvider
            ? 'Stemme krever en API-nøkkel fra Google Gemini eller OpenAI.'
            : 'Lyden sendes til AI-leverandøren din og blir gjort om til tekst du kan se over.'}
      </p>
      {(error || micError) && <p role="alert" className="text-sm text-danger mt-1">{error || micError}</p>}
    </div>
  )
}

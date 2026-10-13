import { useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { transcribeAudio, transcriptionProvider } from '../../hooks/useAi'
import { useSpeechRecognition, speechRecognitionSupported } from '../../hooks/useSpeechRecognition'

interface VoiceButtonProps {
  onText: (text: string) => void
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Ta opp tale, send den til AI-leverandøren og lever teksten tilbake til skjemaet.
export function VoiceButton({ onText }: VoiceButtonProps) {
  const { supported, state, seconds, error: micError, start, stop, maxSeconds } = useVoiceRecorder()
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState('')
  const speech = useSpeechRecognition({ continuous: true })
  const [nativeFailed, setNativeFailed] = useState(false)

  const nativeVoice = speechRecognitionSupported() && !nativeFailed
  if (!supported && !nativeVoice) return null

  const hasProvider = nativeVoice || transcriptionProvider() !== null

  const handleStart = async () => {
    setError('')
    // Telefonens talegjenkjenning først: teksten er klar med en gang du trykker stopp
    if (nativeVoice) {
      const outcome = await speech.start()
      if (outcome.ok) {
        if (outcome.text) onText(outcome.text)
        else setError('Hørte ikke noe tale. Prøv igjen, litt nærmere mikrofonen.')
        return
      }
      if (outcome.reason === 'denied') {
        setError('Appen fikk ikke bruke mikrofonen. Gi tilgang i nettleseren og prøv igjen.')
        return
      }
      if (outcome.reason === 'aborted') return
      setNativeFailed(true)
      if (!supported || transcriptionProvider() === null) {
        setError('Talegjenkjenning er ikke tilgjengelig her.')
        return
      }
    }
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

  const recording = state === 'recording' || speech.listening

  return (
    <div>
      {recording ? (
        <button onClick={() => (speech.listening ? speech.stop() : stop())} className="btn-primary w-full">
          <Square size={14} fill="currentColor" />
          Stopp opptak {!speech.listening && <span className="tabular opacity-80">· {fmt(seconds)}</span>}
        </button>
      ) : (
        <button onClick={handleStart} disabled={transcribing || !hasProvider} className="btn-secondary w-full">
          {transcribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
          {transcribing ? 'Skriver ned …' : 'Snakk inn'}
        </button>
      )}
      <p className="text-sm text-subtle mt-2" aria-live="polite">
        {speech.listening
          ? (speech.transcript ? `«${speech.transcript}»` : 'Snakk fritt. Trykk stopp når du er ferdig.')
          : recording
          ? `Snakk fritt. Trykk stopp når du er ferdig (maks ${maxSeconds / 60} min).`
          : !hasProvider
            ? 'Stemme krever en API-nøkkel fra Google Gemini eller OpenAI.'
            : nativeVoice
              ? 'Telefonen gjør talen om til tekst du kan se over.'
              : 'Lyden sendes til AI-leverandøren din og blir gjort om til tekst du kan se over.'}
      </p>
      {(error || micError) && <p role="alert" className="text-sm text-danger mt-1">{error || micError}</p>}
    </div>
  )
}

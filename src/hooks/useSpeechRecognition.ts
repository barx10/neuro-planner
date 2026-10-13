import { useState, useRef, useCallback, useEffect } from 'react'

// Nettleserens egen talegjenkjenning (Chrome, Edge, Safari). Teksten kommer mens brukeren snakker,
// så det blir ingen ventetid på nedskriving. TypeScript har ikke typene, så de ligger her.
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechRecognitionSupported = () => getCtor() !== null

export type RecognitionOutcome =
  | { ok: true; text: string }
  // unavailable: tjenesten virker ikke her (f.eks. Siri er slått av), så appen bør ta opp lyd i stedet
  | { ok: false; reason: 'denied' | 'unavailable' | 'aborted' }

interface Options {
  // Fortsett å lytte gjennom pauser til brukeren trykker stopp
  continuous?: boolean
}

export function useSpeechRecognition({ continuous = false }: Options = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<Recognition | null>(null)

  useEffect(() => () => recRef.current?.abort(), [])

  const start = useCallback((): Promise<RecognitionOutcome> => {
    const Ctor = getCtor()
    if (!Ctor) return Promise.resolve({ ok: false, reason: 'unavailable' })
    recRef.current?.abort()
    setTranscript('')

    return new Promise(resolve => {
      const rec = new Ctor()
      recRef.current = rec
      rec.lang = 'nb-NO'
      rec.continuous = continuous
      rec.interimResults = true
      let final = ''
      let interim = ''
      let failure: RecognitionOutcome | null = null

      rec.onresult = e => {
        interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) final += r[0].transcript
          else interim += r[0].transcript
        }
        setTranscript((final + interim).trim())
      }
      rec.onerror = e => {
        if (e.error === 'not-allowed') failure = { ok: false, reason: 'denied' }
        else if (e.error === 'aborted') failure = { ok: false, reason: 'aborted' }
        else if (e.error === 'service-not-allowed' || e.error === 'network' || e.error === 'language-not-supported') {
          failure = { ok: false, reason: 'unavailable' }
        }
        // no-speech: gir tom tekst, som behandles som «hørte ikke noe»
      }
      rec.onend = () => {
        if (recRef.current === rec) recRef.current = null
        setListening(false)
        // Noen nettlesere leverer aldri et endelig resultat når de stoppes, så ta med det som ble hørt
        resolve(failure ?? { ok: true, text: (final + interim).trim() })
      }

      try {
        rec.start()
        setListening(true)
      } catch {
        recRef.current = null
        resolve({ ok: false, reason: 'unavailable' })
      }
    })
  }, [continuous])

  // Avslutter og leverer det som er hørt så langt
  const stop = useCallback(() => recRef.current?.stop(), [])
  // Avbryter uten å levere tekst
  const abort = useCallback(() => recRef.current?.abort(), [])

  return { listening, transcript, start, stop, abort }
}

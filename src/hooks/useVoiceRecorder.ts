import { useState, useRef, useCallback, useEffect } from 'react'

const TARGET_RATE = 16_000
const MAX_SECONDS = 120
// Lydnivå (RMS) som regnes som tale. Støydemping er på, så stillhet ligger godt under.
const SPEECH_LEVEL = 0.015
// Stillhet som beholdes før og etter talen, så ord ikke klippes
const PADDING_MS = 300

interface Options {
  // Stopper selv etter så mange millisekunder stillhet, når brukeren har sagt noe
  stopOnSilenceMs?: number
}

type State = 'idle' | 'recording' | 'error'

// Tar opp tale som 16 kHz mono WAV. WAV tas imot av både Gemini og OpenAI,
// og gir samme resultat på Android, iPhone og PC. Stillhet før og etter talen kuttes bort,
// så det blir mindre lyd å sende og raskere svar.
export function useVoiceRecorder({ stopOnSilenceMs }: Options = {}) {
  const [state, setState] = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  // Indeks til første og siste lydbit med tale, og tidspunktet talen sist ble hørt
  const speechRef = useRef<{ first: number; last: number; heardAt: number }>({ first: -1, last: -1, heardAt: 0 })
  const timerRef = useRef<number | undefined>(undefined)
  const resolveRef = useRef<((wav: Blob | null) => void) | null>(null)

  const supported = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof AudioWorkletNode !== 'undefined'

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const stop = useCallback((): Promise<Blob | null> => {
    const ctx = ctxRef.current
    if (!ctx) return Promise.resolve(null)
    const rate = ctx.sampleRate
    const chunkSize = chunksRef.current[0]?.length || 128
    const chunks = trim(chunksRef.current, speechRef.current, Math.ceil((PADDING_MS / 1000) * rate / chunkSize))
    cleanup()
    setState('idle')
    const wav = chunks.length > 0 ? encodeWav(downsample(merge(chunks), rate, TARGET_RATE), TARGET_RATE) : null
    resolveRef.current?.(wav)
    resolveRef.current = null
    return Promise.resolve(wav)
  }, [cleanup])

  // Starter opptak. Promise-en løses med lyden når opptaket stoppes, også ved tidsgrensen.
  const start = useCallback(async (): Promise<Blob | null> => {
    setError('')
    chunksRef.current = []
    speechRef.current = { first: -1, last: -1, heardAt: 0 }
    setSeconds(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      await ctx.audioWorklet.addModule('/recorder-worklet.js')
      const source = ctx.createMediaStreamSource(stream)
      const node = new AudioWorkletNode(ctx, 'recorder')
      node.port.onmessage = e => {
        const chunk = e.data as Float32Array
        const i = chunksRef.current.push(chunk) - 1
        if (rms(chunk) > SPEECH_LEVEL) {
          const sp = speechRef.current
          if (sp.first < 0) sp.first = i
          sp.last = i
          sp.heardAt = Date.now()
        }
      }
      source.connect(node)
      setState('recording')
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000)
        setSeconds(s)
        const { heardAt } = speechRef.current
        if (s >= MAX_SECONDS) stop()
        else if (stopOnSilenceMs && heardAt > 0 && Date.now() - heardAt >= stopOnSilenceMs) stop()
      }, 100)
      return new Promise(resolve => { resolveRef.current = resolve })
    } catch (err) {
      cleanup()
      setState('error')
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Appen fikk ikke bruke mikrofonen. Gi tilgang i nettleseren og prøv igjen.'
          : 'Fikk ikke startet mikrofonen.'
      )
      return null
    }
  }, [cleanup, stop, stopOnSilenceMs])

  return { supported, state, seconds, error, start, stop, maxSeconds: MAX_SECONDS }
}

function rms(chunk: Float32Array): number {
  let sum = 0
  for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i]
  return Math.sqrt(sum / Math.max(1, chunk.length))
}

// Kutter stillhet før og etter talen. Ble ingen tale hørt, beholdes alt, så modellen selv kan avgjøre.
function trim(chunks: Float32Array[], speech: { first: number; last: number }, pad: number): Float32Array[] {
  if (speech.first < 0) return chunks
  return chunks.slice(Math.max(0, speech.first - pad), speech.last + pad + 1)
}

function merge(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const c of chunks) { out.set(c, offset); offset += c.length }
  return out
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (from <= to) return input
  const ratio = from / to
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    out[i] = sum / Math.max(1, end - start)
  }
  return out
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buffer)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

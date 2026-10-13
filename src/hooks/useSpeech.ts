import { synthesizeSpeech } from './useAi'
import { useSettingsStore } from '../store/settingsStore'

// Felles lydkontekst. Nettlesere (særlig Safari) slipper bare gjennom lyd etter et trykk,
// så konteksten startes ved første trykk og kan spille av senere, f.eks. når tidtakeren er ferdig.
let ctx: AudioContext | null = null
let current: AudioBufferSourceNode | null = null
const cache = new Map<string, AudioBuffer>()
const pending = new Map<string, Promise<AudioBuffer>>()
// Teller som øker for hver ny opplesning, så et sent svar ikke spilles over et nyere
let generation = 0

// Hvor lenge Gemini-stemmen får bruke før nettleserens stemme tar over. Å vente lenger
// på svar enn dette kjennes som at appen har hengt seg opp.
const GEMINI_DEADLINE_MS = 1800

function unlock() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch {
    // Lyd er ikke tilgjengelig
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlock, { capture: true })
  document.addEventListener('keydown', unlock, { capture: true })
}

export function stopSpeaking() {
  generation++
  try { current?.stop() } catch { /* allerede stoppet */ }
  current = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

// Nettleserens egen stemme, når Gemini ikke er tilgjengelig
function speakWithBrowser(text: string) {
  if (typeof speechSynthesis === 'undefined') return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nb-NO'
  u.rate = 0.95
  speechSynthesis.speak(u)
}

// Leser opp teksten hvis opplesning er slått på. Feiler stille: tale er et tillegg, ikke en forutsetning.
export async function speak(text: string) {
  const { speechEnabled, apiKeys } = useSettingsStore.getState().settings
  if (speechEnabled === false || !text.trim()) return
  stopSpeaking()

  if (!apiKeys.gemini) {
    speakWithBrowser(text)
    return
  }
  const mine = generation
  try {
    unlock()
    if (!ctx) throw new Error('Ingen lydkontekst')
    const buffer = cache.get(text) ?? await withDeadline(fetchBuffer(ctx, text), GEMINI_DEADLINE_MS)
    if (mine !== generation) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => { if (current === source) current = null }
    current = source
    source.start()
  } catch {
    if (mine === generation) speakWithBrowser(text)
  }
}

// Henter lyden for tekster som snart skal leses opp, så de spilles med en gang når tiden kommer
export function preloadSpeech(texts: string[]) {
  const { speechEnabled, apiKeys } = useSettingsStore.getState().settings
  if (speechEnabled === false || !apiKeys.gemini) return
  unlock()
  if (!ctx) return
  const audio = ctx
  // Én om gangen, så det ikke går ut over grensen for antall kall
  texts.filter(t => t.trim() && !cache.has(t))
    .reduce((chain, t) => chain.then(() => fetchBuffer(audio, t).then(() => {}, () => {})), Promise.resolve())
}

// Henter Gemini-lyden én gang per tekst. Kommer den for sent, ligger den klar til neste gang.
function fetchBuffer(audio: AudioContext, text: string): Promise<AudioBuffer> {
  let p = pending.get(text)
  if (!p) {
    p = synthesizeSpeech(text)
      .then(data => audio.decodeAudioData(data))
      .then(buffer => { cache.set(text, buffer); return buffer })
      .finally(() => pending.delete(text))
    pending.set(text, p)
  }
  return p
}

function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('For tregt')), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

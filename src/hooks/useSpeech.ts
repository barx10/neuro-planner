import { synthesizeSpeech } from './useAi'
import { useSettingsStore } from '../store/settingsStore'

// Felles lydkontekst. Nettlesere (særlig Safari) slipper bare gjennom lyd etter et trykk,
// så konteksten startes ved første trykk og kan spille av senere, f.eks. når tidtakeren er ferdig.
let ctx: AudioContext | null = null
let current: AudioBufferSourceNode | null = null
const cache = new Map<string, AudioBuffer>()

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
  try {
    unlock()
    if (!ctx) throw new Error('Ingen lydkontekst')
    let buffer = cache.get(text)
    if (!buffer) {
      buffer = await ctx.decodeAudioData(await synthesizeSpeech(text))
      cache.set(text, buffer)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => { if (current === source) current = null }
    current = source
    source.start()
  } catch {
    speakWithBrowser(text)
  }
}

import { useSettingsStore } from '../store/settingsStore'
import { PROVIDERS } from '../utils/aiProviders'
import type { AiModel, AiProvider, BlockedPeriod } from '../types'

function getSettings() {
  return useSettingsStore.getState().settings
}

// --- Felles HTTP med nye forsøk ---

// Midlertidig feil hos leverandøren: overbelastet, for mange kall eller serverfeil.
class TransientError extends Error {}

const TRANSIENT = new Set([429, 500, 502, 503, 504, 529])
const RETRY_DELAYS_MS = [1000, 3000]

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

async function postJson(url: string, init: RequestInit) {
  for (let attempt = 0; ; attempt++) {
    let res: Response
    try {
      res = await fetch(url, { ...init, method: 'POST' })
    } catch {
      throw new Error('Fikk ikke kontakt med AI-tjenesten. Sjekk nettforbindelsen.')
    }
    const data = await res.json().catch(() => ({}))
    if (res.ok && !data.error) return data

    if (TRANSIENT.has(res.status)) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt])
        continue
      }
      throw new TransientError(data.error?.message ?? `HTTP ${res.status}`)
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('API-nøkkelen ble avvist. Sjekk den under Innstillinger.')
    }
    throw new Error(data.error?.message ?? `Uventet svar fra AI-tjenesten (${res.status})`)
  }
}

// --- Anthropic ---

async function anthropicChat(model: AiModel, system: string, userMessage: string, maxTokens: number): Promise<string> {
  const { apiKeys } = getSettings()
  if (!apiKeys.anthropic) throw new Error('Mangler Anthropic API-nøkkel')
  const data = await postJson('https://api.anthropic.com/v1/messages', {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKeys.anthropic,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      // Nyere modeller tenker som standard, og tenkingen deler token-grensen
      max_tokens: Math.max(maxTokens, 2000),
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: userMessage }]
    })
  })
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
  if (!textBlock) throw new Error('Tomt svar fra Anthropic')
  return textBlock.text.trim()
}

// --- Gemini ---

async function geminiChat(model: AiModel, system: string, userMessage: string): Promise<string> {
  const { apiKeys } = getSettings()
  if (!apiKeys.gemini) throw new Error('Mangler Gemini API-nøkkel')
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys.gemini}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      })
    }
  )
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Tomt svar fra Gemini')
  return text.trim()
}

// --- OpenAI ---

async function openaiChat(model: AiModel, system: string, userMessage: string, maxTokens: number): Promise<string> {
  const { apiKeys } = getSettings()
  if (!apiKeys.openai) throw new Error('Mangler OpenAI API-nøkkel')
  const data = await postJson('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeys.openai}`
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage }
      ]
    })
  })
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Tomt svar fra OpenAI')
  return text.trim()
}

// --- Unified helper ---

// Prøver modellene i rekkefølge og går videre bare når en modell er midlertidig overbelastet.
async function withFallback<M extends string, T>(models: M[], run: (model: M) => Promise<T>): Promise<T> {
  for (const model of models) {
    try {
      return await run(model)
    } catch (err) {
      if (!(err instanceof TransientError)) throw err
    }
  }
  throw new Error('AI-tjenesten er overbelastet akkurat nå. Vent litt og prøv igjen.')
}

// Valgt modell først, deretter de andre fra samme leverandør.
function modelOrder(provider: AiProvider, preferred?: AiModel): AiModel[] {
  const all = PROVIDERS.find(p => p.value === provider)?.models.map(m => m.value) ?? []
  return preferred && all.includes(preferred) ? [preferred, ...all.filter(m => m !== preferred)] : all
}

async function chat(system: string, userMessage: string, maxTokens = 500): Promise<string> {
  const { aiProvider, aiModel } = getSettings()
  return withFallback(modelOrder(aiProvider, aiModel), model => {
    if (aiProvider === 'gemini') return geminiChat(model, system, userMessage)
    if (aiProvider === 'openai') return openaiChat(model, system, userMessage, maxTokens)
    return anthropicChat(model, system, userMessage, maxTokens)
  })
}

// --- Tale til tekst ---

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Hvem som skriver ned talen. Anthropic tar ikke imot lyd, så da brukes en annen nøkkel om den finnes.
export function transcriptionProvider(): 'gemini' | 'openai' | null {
  const { aiProvider, apiKeys } = getSettings()
  if (aiProvider === 'gemini' && apiKeys.gemini) return 'gemini'
  if (aiProvider === 'openai' && apiKeys.openai) return 'openai'
  if (apiKeys.gemini) return 'gemini'
  if (apiKeys.openai) return 'openai'
  return null
}

export async function transcribeAudio(audio: Blob): Promise<string> {
  const provider = transcriptionProvider()
  const { aiProvider, aiModel, apiKeys } = getSettings()
  if (!provider) throw new Error('Stemme krever en API-nøkkel fra Google Gemini eller OpenAI.')

  if (provider === 'openai') {
    const form = new FormData()
    form.append('file', audio, 'tale.wav')
    form.append('model', 'gpt-transcribe')
    const data = await withFallback(['gpt-transcribe'], () =>
      postJson('https://api.openai.com/v1/audio/transcriptions', {
        headers: { 'Authorization': `Bearer ${apiKeys.openai}` },
        body: form,
      })
    )
    return String(data.text ?? '').trim()
  }

  const base64 = await blobToBase64(audio)
  const models = modelOrder('gemini', aiProvider === 'gemini' ? aiModel : undefined)
  return withFallback(models, async model => {
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys.gemini}`,
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Skriv ned nøyaktig hva som blir sagt i lydopptaket, på det språket det snakkes (som regel norsk). Svar bare med teksten, uten kommentarer. Er opptaket stille eller uforståelig, svar med en tom streng.' },
              { inline_data: { mime_type: 'audio/wav', data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
      }
    )
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return String(text ?? '').trim()
  })
}

// --- Public API ---

export async function breakdownTask(taskTitle: string): Promise<string[]> {
  const result = await chat(
    `Du er en varm og støttende hjelper for folk med ADHD og autisme. Du vet at store oppgaver kan kjennes overveldende, og hjelper med å gjøre dem overkommelige ett lite steg om gangen.
Svar med en JSON-array av strenger — ingen forklaring, kun arrayen.
Eksempel: ["Steg 1", "Steg 2", "Steg 3"]`,
    `Bryt ned denne oppgaven i 3–5 små, konkrete steg som er enkle å komme i gang med: "${taskTitle}"`,
    500
  )
  return JSON.parse(result)
}

export interface DayPlanResult {
  tasks: Array<{
    title: string
    emoji: string
    startTime: string
    durationMinutes: number
  }>
  analysis: string
}

export async function generateDayPlan(
  input: string,
  busy: BlockedPeriod[] = []
): Promise<DayPlanResult> {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const { latestTaskTime } = getSettings()

  const blockedInfo = busy.length > 0
    ? `\nBRUKEREN ER OPPTATT i disse periodene: ${busy.map(p => `${p.start}–${p.end}${p.label ? ` (${p.label})` : ''}`).join(', ')}. Ingen oppgave kan starte eller pågå i disse periodene. Bruk den ledige tiden mellom og etter periodene.`
    : ''

  const result = await chat(
    `Du er en varm og støttende dagplanlegger for folk med ADHD og autisme. Du vet at god struktur, realistiske mål og pusterom mellom aktiviteter gjør en stor forskjell.${blockedInfo}
Klokken er nå ${currentTime} i Norge. Planlegg kun fremover fra nå.

Svar med et JSON-objekt med to felter:
1. "tasks": oppgavene. Hvert objekt: { title, emoji, startTime ("HH:mm"), durationMinutes }
2. "analysis": 2–3 setninger som kommenterer planen på en varm og oppmuntrende måte. Fremhev noe positivt ved planen, og gi gjerne ett konkret tips.

Husk for oppgavene:
- Alltid minst 10 minutter pause mellom oppgavene — neste oppgave starter tidligst (forrige start + forrige varighet + 10) minutter
- Maks 6 timer aktivt arbeid totalt
- Veksle mellom krevende og lettere oppgaver
- Ingen oppgaver før ${currentTime}
- INGEN oppgaver som starter etter ${latestTaskTime} — dagen er ferdig da

Kun JSON. Ingen markdown eller tekst utenfor objektet.`,
    `Hjelp meg planlegge dagen min: "${input}"`,
    1500
  )
  // Strip markdown code fences if present
  const cleaned = result.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  // Handle both { tasks, analysis } and plain array format
  if (Array.isArray(parsed)) {
    return { tasks: parsed, analysis: '' }
  }
  return { tasks: parsed.tasks || [], analysis: parsed.analysis || '' }
}

// --- Hurtigregistrering: én beskjed blir til én eller flere avtaler ---

export interface ParsedAppointment {
  title: string
  emoji: string
  date: string               // "YYYY-MM-DD"
  startTime: string | null   // "HH:mm", null hvis ingen tid ble nevnt
  durationMinutes: number
  reminderMinutes: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const WEEKDAY_NAMES = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']

function appointmentPrompt(): string {
  const now = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    return `${i === 0 ? 'i dag' : i === 1 ? 'i morgen' : WEEKDAY_NAMES[d.getDay()]} = ${ymd(d)}`
  })
  return `Du gjør korte beskjeder om avtaler og gjøremål om til strukturerte oppføringer i en dagplanlegger.
Nå er det ${WEEKDAY_NAMES[now.getDay()]} ${ymd(now)}, klokken ${pad(now.getHours())}:${pad(now.getMinutes())} i Norge.
Datoer de neste 14 dagene (et ukedagsnavn betyr første forekomst): ${days.join(', ')}.

Svar med JSON: {"items": [{"title", "emoji", "date", "startTime", "durationMinutes", "reminderMinutes"}]}
- title: kort og tydelig med stor forbokstav, uten tid og dato. Eksempel: "Tannlege".
- emoji: ett passende emoji.
- date: "YYYY-MM-DD". Uten dato: i dag hvis tidspunktet ikke har passert, ellers i morgen.
- startTime: "HH:mm" i 24-timersformat, eller null hvis ingen tid er nevnt. "Halv tre" betyr 14:30 på dagtid. Uten am/pm velges det mest sannsynlige tidspunktet mellom 07 og 22.
- durationMinutes: oppgitt varighet, ellers 60 for avtaler som lege, tannlege og møter, og 30 for andre ting.
- reminderMinutes: oppgitt påminnelse i minutter før start, ellers 30 for avtaler utenfor hjemmet og 10 for andre ting.
Én beskjed kan inneholde flere avtaler. Er det ingen avtale i beskjeden, svar {"items": []}.
Kun JSON.`
}

function parseItems(raw: string): ParsedAppointment[] {
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  const items: unknown[] = Array.isArray(parsed) ? parsed : parsed.items ?? []
  return items
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(x => ({
      title: String(x.title ?? '').trim(),
      emoji: String(x.emoji ?? '\u{1F4CC}'),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) ? String(x.date) : ymd(new Date()),
      startTime: /^\d{2}:\d{2}$/.test(String(x.startTime)) ? String(x.startTime) : null,
      durationMinutes: Number(x.durationMinutes) > 0 ? Math.round(Number(x.durationMinutes)) : 30,
      reminderMinutes: Number(x.reminderMinutes) >= 0 ? Math.round(Number(x.reminderMinutes)) : 10,
    }))
    .filter(x => x.title)
}

// Tale: med Gemini-nøkkel tolkes lyden direkte i ett kall. Ellers skrives den ned først og tolkes som tekst.
export async function parseAppointments(input: { text: string } | { audio: Blob }): Promise<{ items: ParsedAppointment[]; heard?: string }> {
  const system = appointmentPrompt()

  if ('text' in input) return { items: parseItems(await chat(system, input.text, 800)) }

  const { aiProvider, aiModel, apiKeys } = getSettings()
  if (transcriptionProvider() !== 'gemini') {
    const heard = await transcribeAudio(input.audio)
    if (!heard) return { items: [], heard }
    return { items: parseItems(await chat(system, heard, 800)), heard }
  }

  const base64 = await blobToBase64(input.audio)
  const raw = await withFallback(modelOrder('gemini', aiProvider === 'gemini' ? aiModel : undefined), async model => {
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys.gemini}`,
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [
            { text: 'Her er beskjeden som lydopptak:' },
            { inline_data: { mime_type: 'audio/wav', data: base64 } },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      }
    )
    return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[]}')
  })
  return { items: parseItems(raw) }
}

import { useSettingsStore } from '../store/settingsStore'
import { PROVIDERS } from '../utils/aiProviders'
import type { AiModel } from '../types'

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

// Prøver valgt modell først. Er den overbelastet, prøves de andre modellene fra samme leverandør.
async function chat(system: string, userMessage: string, maxTokens = 500): Promise<string> {
  const { aiProvider, aiModel } = getSettings()
  const others = PROVIDERS.find(p => p.value === aiProvider)?.models.map(m => m.value).filter(m => m !== aiModel) ?? []
  for (const model of [aiModel, ...others]) {
    try {
      if (aiProvider === 'gemini') return await geminiChat(model, system, userMessage)
      if (aiProvider === 'openai') return await openaiChat(model, system, userMessage, maxTokens)
      return await anthropicChat(model, system, userMessage, maxTokens)
    } catch (err) {
      if (!(err instanceof TransientError)) throw err
    }
  }
  throw new Error('AI-tjenesten er overbelastet akkurat nå. Vent litt og prøv igjen.')
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
  blockedPeriod?: { start: string; end: string; label: string } | null
): Promise<DayPlanResult> {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const { latestTaskTime } = getSettings()

  const blockedInfo = blockedPeriod
    ? `\nBRUKEREN ER OPPTATT (${blockedPeriod.label}) fra ${blockedPeriod.start} til ${blockedPeriod.end}. Ikke planlegg NOEN oppgaver i denne perioden. Legg alle oppgaver etter ${blockedPeriod.end}.`
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

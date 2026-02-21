import { useSettingsStore } from '../store/settingsStore'

function getSettings() {
  return useSettingsStore.getState().settings
}

// --- Anthropic ---

async function anthropicChat(system: string, userMessage: string, maxTokens: number): Promise<string> {
  const { apiKeys, aiModel } = getSettings()
  if (!apiKeys.anthropic) throw new Error('Mangler Anthropic API-nøkkel')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKeys.anthropic,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: aiModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }]
    })
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text.trim()
}

// --- Gemini ---

async function geminiChat(system: string, userMessage: string): Promise<string> {
  const { apiKeys, aiModel } = getSettings()
  if (!apiKeys.gemini) throw new Error('Mangler Gemini API-nøkkel')
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKeys.gemini}`,
    {
      method: 'POST',
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
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates[0].content.parts[0].text.trim()
}

// --- OpenAI ---

async function openaiChat(system: string, userMessage: string, maxTokens: number): Promise<string> {
  const { apiKeys, aiModel } = getSettings()
  if (!apiKeys.openai) throw new Error('Mangler OpenAI API-nøkkel')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeys.openai}`
    },
    body: JSON.stringify({
      model: aiModel,
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage }
      ]
    })
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content.trim()
}

// --- Unified helper ---

async function chat(system: string, userMessage: string, maxTokens = 500): Promise<string> {
  const { aiProvider } = getSettings()
  if (aiProvider === 'gemini') return geminiChat(system, userMessage)
  if (aiProvider === 'openai') return openaiChat(system, userMessage, maxTokens)
  return anthropicChat(system, userMessage, maxTokens)
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

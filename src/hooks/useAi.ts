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
    `Du er en hjelpsom assistent for nevrodivergente brukere.
Svar ALLTID med kun en JSON-array av strenger. Ingen forklaring, ingen markdown.
Eksempel: ["Steg 1", "Steg 2", "Steg 3"]`,
    `Del opp denne oppgaven i 3-5 enkle, konkrete steg for en person med ADHD: "${taskTitle}"`,
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

export async function generateDayPlan(input: string): Promise<DayPlanResult> {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const result = await chat(
    `Du er en smart dagplanlegger for nevrodivergente (ADHD/autisme). Brukeren er i Norge (CET/CEST).
Klokken er nå ${currentTime}. Planlegg KUN fremover fra nå.

Svar ALLTID med et JSON-objekt med to felter:
1. "tasks": en array med oppgaver. Hvert objekt: { title, emoji, startTime ("HH:mm"), durationMinutes }
2. "analysis": en kort, vennlig analyse (2-3 setninger) om dagplanen. Vurder:
   - Er det nok pauser mellom oppgavene?
   - Er mengden realistisk for én dag?
   - Er krevende oppgaver lagt til tidspunkt med typisk høyere energi?
   - Tips tilpasset nevrodivergente (f.eks. korte økter, belønningspauser)

Regler for oppgavene:
- Legg inn korte pauser (5-15 min) mellom krevende oppgaver
- Ikke planlegg mer enn 6 timer aktivt arbeid per dag
- Varier mellom krevende og lette oppgaver
- Start aldri før ${currentTime}

Ingen markdown, ingen forklaring utenfor JSON. Kun JSON-objektet.`,
    `Lag en realistisk dagplan basert på dette: "${input}"`,
    1500
  )
  const parsed = JSON.parse(result)
  // Handle both { tasks, analysis } and plain array format
  if (Array.isArray(parsed)) {
    return { tasks: parsed, analysis: '' }
  }
  return parsed
}

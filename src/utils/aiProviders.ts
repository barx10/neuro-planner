import type { AiProvider, AiModel } from '../types'

// Første modell i hver liste er standard for leverandøren.
export const PROVIDERS: {
  value: AiProvider
  label: string
  models: { value: AiModel; label: string }[]
}[] = [
  {
    value: 'gemini',
    label: 'Google Gemini',
    models: [
      { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
      { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    models: [
      { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
      { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: [
      { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { value: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
    ],
  },
]

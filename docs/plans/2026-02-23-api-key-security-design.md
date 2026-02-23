# API Key Security Design

## Problem
BYOK API keys are stored in IndexedDB and visible in DevTools. Users need confidence their keys are safe before launch.

## Solution: 4 features

### 1. "Remember key" toggle in Settings
- New `rememberKeys: boolean` in `UserSettings` (default: true)
- When OFF: keys live only in Zustand state, never written to IndexedDB
- When toggled OFF: clear existing keys from IndexedDB immediately
- Small info text explains the trade-off

### 2. Security section in HelpPanel
New section with shield emoji covering:
- Keys stored locally only, never sent to Neurominder servers
- API calls go directly from device to AI provider
- PWA install recommendation for extra sandboxing
- Optional session-only storage explanation

### 3. CSP headers in vercel.json
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://*.upstash.io; frame-src 'none'; object-src 'none'"
        }
      ]
    }
  ]
}
```

### 4. Security info banner in SettingsPanel
Shield icon + short text under API key input: "Nøkkelen lagres kun på din enhet og sendes direkte til [provider]."

## Files to modify
1. `src/types/index.ts` — add `rememberKeys` to UserSettings
2. `src/store/settingsStore.ts` — conditional IndexedDB write for keys
3. `src/components/ui/SettingsPanel.tsx` — toggle + security banner
4. `src/components/ui/HelpPanel.tsx` — new security section
5. `vercel.json` — CSP headers

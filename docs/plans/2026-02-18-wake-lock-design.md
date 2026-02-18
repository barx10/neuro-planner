# Wake Lock – Design

**Dato:** 2026-02-18

## Mål

Hold skjermen alltid på mens FocusTimer er åpen, slik at brukeren kan følge nedtellingen uten at skjermen slukker.

## Løsning

### Ny fil: `src/hooks/useWakeLock.ts`

En hook som:
- Acquirer `navigator.wakeLock.request('screen')` ved mount
- Releaser wake lock ved unmount (cleanup)
- Lytter på `document.visibilitychange` og re-acquirer når appen kommer tilbake i forgrunnen (nettleseren slipper wake lock automatisk ved minimering)
- Feiler stille hvis Wake Lock API ikke støttes

### Endring: `src/components/planner/FocusTimer.tsx`

- Legg til `useWakeLock()` øverst i komponenten
- Wake lock aktiv hele tiden FocusTimer er i DOM
- Slippes automatisk ved lukking

## Nettleserstøtte

- Chrome/Edge/Android: full støtte
- Safari 16.4+ (inkl. iOS PWA): støttes
- Firefox: ikke støttet, feiler stille

## Ikke i scope

- Wake lock utenfor FocusTimer
- Brukervalg om å slå av/på funksjonen

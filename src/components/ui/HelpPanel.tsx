import { X } from 'lucide-react'

interface HelpPanelProps {
  onClose: () => void
}

const SECTIONS = [
  {
    emoji: '🧠',
    title: 'Hva er Neurominder?',
    content: `Neurominder er en dagplanlegger laget spesielt for deg som har ADHD, autisme eller andre nevrodivergente trekk. Appen hjelper deg å strukturere dagen, holde oversikt og komme i gang — uten å bli overveldet.

Inspirert av Tiimo, men bygget for å fungere som en PWA (Progressive Web App) du kan installere direkte på telefonen.`,
  },
  {
    emoji: '👤',
    title: 'Hvem er den for?',
    content: `Neurominder er for deg som:
• Sliter med å komme i gang med oppgaver
• Trenger visuell struktur for å holde oversikten
• Har nytte av tidsbegrensede fokusøkter
• Vil bruke AI til å planlegge dagen

Enten du er elev, student eller voksen i jobb — appen tilpasser seg deg.`,
  },
  {
    emoji: '📱',
    title: 'Fanene i appen',
    content: `🏠 Hjem — Se dagens oppgaver delt inn i Morgen, Dag og Kveld. Legg til oppgaver, start tidtaker og la AI planlegge for deg.

📋 Aktiviteter — Din personlige aktivitetsliste. Legg inn faste gjøremål i kategoriene Arbeid, Husholdning og Behov — og velg fra listen når du lager dagsplan.

📈 Progresjon — Se ukentlig fremgang, streak og motivasjonsmeldinger. Feirer det du faktisk får gjort.

❤️ Velvære — Logg humøret ditt hver dag og se mønster over uken.`,
  },
  {
    emoji: '🍅',
    title: 'Pomodoro-modus',
    content: `Alle oppgaver med varighet på 25 minutter eller mer bruker automatisk Pomodoro-teknikken:

• 25 min fokusert arbeid
• 5 min pause
• Gjenta etter behov

Timeren viser en visuell progress-ring og varsler deg når det er tid for pause eller å fortsette. Du starter timeren ved å trykke på klokke-ikonet på en oppgave.

Kortere oppgaver (under 25 min) bruker en enkel nedtellingstidtaker.`,
  },
  {
    emoji: '🤖',
    title: 'AI-planlegger',
    content: `Skriv inn hva du skal gjøre i dag — og AI lager en ferdig dagsplan med oppgaver, tidspunkter og varigheter. Du kan bruke tre ulike AI-tjenester:

• Google Gemini (gratis å prøve)
• OpenAI GPT
• Anthropic Claude

Du bruker din egen API-nøkkel (BYOK — Bring Your Own Key). Nøkkelen lagres kun lokalt på din enhet og sendes aldri til Neurominder sine servere. Konfigurer under ⚙️ Innstillinger.`,
  },
  {
    emoji: '🔒',
    title: 'Sikkerhet og API-nøkler',
    content: `Neurominder bruker BYOK (Bring Your Own Key) — du bruker din egen API-nøkkel for AI-funksjoner. Slik holder vi den trygg:

• Nøkkelen lagres kun lokalt på din enhet (i nettleserens database)
• Den sendes aldri til Neurominder sine servere
• API-kall går direkte fra din enhet til AI-leverandøren (Google, OpenAI eller Anthropic)
• Du kan slå av "Husk nøkkel" i innstillingene — da forsvinner den når du lukker appen

For ekstra sikkerhet: Installer Neurominder som app på hjemskjermen. Da kjører den i et eget vindu uten adresselinje eller DevTools, og data er sandboxet — omtrent som en vanlig app.

Neurominder har også sikkerhetspolicyer (CSP) som hindrer uautoriserte scripts fra å kjøre på siden.`,
  },
  {
    emoji: '🔔',
    title: 'Push-varsler',
    content: `Neurominder kan sende deg påminnelser når en oppgave skal starte. Varsler fungerer selv om du ikke har appen åpen.

Slik aktiverer du:
1. Gå til ⚙️ Innstillinger
2. Trykk på varsel-knappen og gi tillatelse

Fungerer best i Chrome på desktop og Android. iOS Safari har begrenset støtte for web push-varsler.`,
  },
  {
    emoji: '💡',
    title: 'Tips for å komme i gang',
    content: `• Start med bare 2–3 oppgaver for dagen — ikke overfyll planen
• Bruk AI-planleggeren hvis du ikke vet hvor du skal begynne
• La Pomodoro-timeren hjelpe deg å komme i gang — du trenger bare å starte
• Logg humøret ditt hver dag for å se mønstre over tid
• Installer appen på telefonen for best opplevelse (legg til på hjem-skjerm)`,
  },
]

export function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Hjelp og veiledning</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[48px] min-h-[48px] flex items-center justify-center transition-all active:scale-90"
            aria-label="Lukk"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map(section => (
            <div
              key={section.title}
              className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{section.emoji}</span>
                <h3 className="font-bold text-sm">{section.title}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Neurominder — laget med ❤️ for nevrodivergente
        </p>
      </div>
    </div>
  )
}

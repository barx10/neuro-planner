import { ChevronDown, Globe, Mail } from 'lucide-react'
import { Sheet } from './Sheet'

interface HelpPanelProps {
  onClose: () => void
}

const SECTIONS = [
  {
    title: 'Hva er Neurominder?',
    content: `En dagplanlegger for deg som har ADHD, autisme eller andre nevrodivergente trekk. Den hjelper deg å se hva som skjer nå, hva som kommer etterpå, og å komme i gang uten å bli overveldet.

Neurominder er en nettapp du kan installere på telefonen. Den fungerer også uten nett.`,
  },
  {
    title: 'Slik bruker du appen',
    content: `I dag: Dagens oppgaver, delt i morgen, dag og kveld. Øverst ser du hva som skjer nå eller kommer neste. Trykk på en oppgave for å endre den, på sirkelen for å krysse av, og på avspillingsknappen for å starte tidtakeren.

Aktiviteter: Faste gjøremål du kan velge raskt når du legger til en oppgave.

Oversikt: Hvor mye du har fått gjort denne uken, og hvordan energien har vært.`,
  },
  {
    title: 'Snakk inn en avtale',
    content: `Kommer du på noe i løpet av dagen, trykk på mikrofonknappen nede til høyre og si hva og når, for eksempel «tannlegen halv tre på fredag». Appen finner dag og tid og viser et forslag du kan rette før det legges inn.

Påminnelser fra appen kommer bare når den er åpen eller nylig brukt. Vil du være sikker på å bli minnet på det, trykk «Legg i kalender» etterpå, så tar telefonens kalender seg av påminnelsen.`,
  },
  {
    title: 'Tidtaker og fokusøkter',
    content: `Oppgaver under 25 minutter får en enkel nedtelling.

Lengre oppgaver deles i økter på 25 minutter. Mellom øktene velger du selv om du vil ha 3 eller 5 minutter pause, eller hoppe over den. Når tiden er ute, kan du krysse av oppgaven rett fra tidtakeren.`,
  },
  {
    title: 'Planlegg med AI',
    content: `Skriv eller snakk inn hva du skal gjøre, så får du et forslag med tider og pauser. Trykker du «Snakk inn», tas tale opp og gjøres om til tekst du kan se over før planen lages. Du kan justere tidene før du legger planen inn. Når du redigerer en oppgave, kan AI også dele den opp i små steg.

Du bruker din egen API-nøkkel fra Google Gemini, OpenAI eller Anthropic. Legg den inn under Innstillinger. Stemme krever nøkkel fra Gemini eller OpenAI, siden Anthropic ikke tar imot lyd.`,
  },
  {
    title: 'Personvern og API-nøkler',
    content: `Alt du legger inn, lagres bare på enheten din. API-nøkkelen sendes direkte til AI-leverandøren og aldri til Neurominder. Det samme gjelder lydopptak når du snakker inn en plan; opptaket lagres ikke.

Slår du av «Husk nøkkelen», glemmes den når du lukker appen. Installert på hjemskjermen kjører appen i et eget vindu, adskilt fra nettleseren.`,
  },
  {
    title: 'Varsler',
    content: `Neurominder kan minne deg på når en oppgave starter, også når appen ikke er åpen. Slå på varsler under Innstillinger.

Varsler fungerer best i Chrome på Android og datamaskin. På iPhone må appen være lagt til på hjemskjermen.`,
  },
  {
    title: 'Tips for å komme i gang',
    content: `Begynn med to eller tre oppgaver om dagen. Det er bedre å få gjort lite enn å planlegge for mye.

Vet du ikke hvor du skal begynne, trykk Start på det som står øverst. Du trenger bare å starte.`,
  },
]

export function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <Sheet title="Hjelp" onClose={onClose}>
      <div className="card divide-y divide-line">
        {SECTIONS.map(section => (
          <details key={section.title} className="group">
            <summary className="flex items-center gap-3 px-4 min-h-[56px] cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{section.title}</span>
              <ChevronDown size={18} className="text-subtle transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-4 pb-4 text-sm text-muted whitespace-pre-line leading-relaxed">{section.content}</p>
          </details>
        ))}
      </div>

      <section className="mt-8" aria-labelledby="about-title">
        <h3 id="about-title" className="label mb-3">Om</h3>
        <p className="font-medium">Kenneth Bareksten</p>
        <p className="text-sm text-muted">Lektor og hobbyprogrammerer. Lager digitale verktøy som gjør hverdagen litt enklere.</p>
        <div className="card divide-y divide-line mt-4">
          <a href="https://laererliv.no" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 min-h-[52px] hover:bg-sunken first:rounded-t-2xl">
            <Globe size={18} className="text-muted" aria-hidden />
            <span className="flex-1 text-sm">laererliv.no</span>
          </a>
          <a href="mailto:kenneth@laererliv.no" className="flex items-center gap-3 px-4 min-h-[52px] hover:bg-sunken last:rounded-b-2xl">
            <Mail size={18} className="text-muted" aria-hidden />
            <span className="flex-1 text-sm">kenneth@laererliv.no</span>
          </a>
        </div>
        <p className="text-sm text-subtle mt-6 text-center">Neurominder · versjon 1.1</p>
      </section>
    </Sheet>
  )
}

import type { ParsedAppointment } from '../hooks/useAi'

// Tolker enkle beskjeder som «tannlege halv tre på fredag» uten AI, så svaret kommer med en gang.
// Returnerer null når beskjeden er for uklar eller inneholder flere avtaler, og AI bør ta over.

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// \b i JavaScript kjenner ikke æ, ø og å som bokstaver. Denne ordgrensen gjør det.
const B = String.raw`(?:(?<![\p{L}\d])(?=[\p{L}\d])|(?<=[\p{L}\d])(?![\p{L}\d]))`
const r = (source: string, flags = '') => new RegExp(source.replaceAll('\\b', B), flags + 'u')

const NUMBERS: Record<string, number> = {
  en: 1, ett: 1, ein: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, sju: 7, syv: 7,
  åtte: 8, ni: 9, ti: 10, elleve: 11, tolv: 12, kvart: 15, tjue: 20,
}
const NUM = `(\\d{1,2}|${Object.keys(NUMBERS).join('|')})`
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMBERS[s])

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']

// Ord som gjør at det regnes som en avtale ute, med lengre varighet og tidligere påminnelse
const APPOINTMENT_WORDS = r(String.raw`\b(lege|legen|tannlege|tannlegen|fastlege|møte|møtet|frisør|frisøren|time|timen|sykehus|sykehuset|fysio|fysioterapeut|psykolog|psykologen|samtale|intervju|foreldremøte|utviklingssamtale)\b`)

const EMOJIS: [RegExp, string][] = [
  [/tannlege/, '\u{1F9B7}'],
  [/lege|sykehus|legevakt/, '\u{1FA7A}'],
  [/psykolog|samtale/, '\u{1F4AC}'],
  [/frisør/, '\u{1F487}'],
  [/møte|intervju/, '\u{1F465}'],
  [/trening|trene|gym|løpe|svømm|fotball|håndball/, '\u{1F3CB}\u{FE0F}'],
  [/handle|butikk|innkjøp/, '\u{1F6D2}'],
  [/middag|lunsj|frokost|spise|mat/, '\u{1F37D}\u{FE0F}'],
  [/bursdag|selskap|fest/, '\u{1F389}'],
  [/skole|lekse|prøve|eksamen/, '\u{1F4DA}'],
  [/ringe|telefon/, '\u{1F4DE}'],
  [/hente|levere|kjøre/, '\u{1F697}'],
  [/vaske|rydde/, '\u{1F9F9}'],
  [/medisin/, '\u{1F48A}'],
]

// Klokkeslett uten am/pm: velg det mest sannsynlige mellom 07 og 22
function daytime(hour: number, period: string | undefined): number {
  if (period && /kveld|ettermiddag|natt/.test(period) && hour < 12) return hour + 12
  if (period && /morgen|formiddag/.test(period)) return hour % 12
  return hour >= 1 && hour <= 6 ? hour + 12 : hour
}

interface Match { start: number; end: number }

function findTime(text: string): { time: string; spans: Match[] } | null | 'many' {
  const found: { hour: number; minute: number; spans: Match[]; explicit24: boolean }[] = []
  const span = (m: RegExpExecArray): Match => ({ start: m.index, end: m.index + m[0].length })
  const taken = (m: RegExpExecArray) => found.some(f => f.spans.some(s => m.index < s.end && m.index + m[0].length > s.start))

  const patterns: [RegExp, (m: RegExpExecArray) => [number, number, boolean] | null][] = [
    // 14:30, 14.30, kl 9.15
    [r(String.raw`\b(?:kl(?:\.|okka|okken)?\s*)?(\d{1,2})[:.](\d{2})\b`, 'g'), m => [Number(m[1]), Number(m[2]), Number(m[1]) > 12 || m[1].startsWith('0')]],
    // fem over halv tre, ti på halv fire
    [r(`\\b(?:kl(?:\\.|okka|okken)?\\s*)?${NUM}\\s+(over|på)\\s+halv\\s+${NUM}\\b`, 'g'), m => {
      const h = num(m[3]) - 1, d = num(m[1])
      return [h, m[2] === 'over' ? 30 + d : 30 - d, false]
    }],
    // halv tre
    [r(`\\b(?:kl(?:\\.|okka|okken)?\\s*)?halv\\s+${NUM}\\b`, 'g'), m => [num(m[1]) - 1, 30, false]],
    // kvart over tre, ti på fire
    [r(`\\b(?:kl(?:\\.|okka|okken)?\\s*)?${NUM}\\s+(over|på)\\s+${NUM}\\b`, 'g'), m => {
      const d = num(m[1]), h = num(m[3])
      return m[2] === 'over' ? [h, d, false] : [h - 1, 60 - d, false]
    }],
    // klokka tre, kl 14
    [r(`\\bkl(?:\\.|okka|okken)?\\s*${NUM}\\b`, 'g'), m => [num(m[1]), 0, num(m[1]) > 12]],
  ]

  for (const [re, toTime] of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      if (taken(m)) continue
      const t = toTime(m)
      if (!t) continue
      const [h, min, explicit24] = t
      if (h < 0 || h > 23 || min < 0 || min > 59) continue
      found.push({ hour: h, minute: min, spans: [span(m)], explicit24 })
    }
  }
  if (found.length === 0) return null
  if (found.length > 1) return 'many'

  const f = found[0]
  const after = text.slice(f.spans[0].end)
  const period = r(String.raw`^\s*(?:om|på|i)?\s*(morgenen|formiddagen|ettermiddagen|kvelden|natta|natten|kveld|ettermiddag|formiddag)\b`).exec(after)
  if (period) f.spans.push({ start: f.spans[0].end, end: f.spans[0].end + period[0].length })
  const hour = f.explicit24 ? f.hour : daytime(f.hour === 0 ? 12 : f.hour, period?.[1])
  return { time: `${pad(hour)}:${pad(f.minute)}`, spans: f.spans }
}

function findDate(text: string, now: Date): { date: string; spans: Match[] } | null | 'many' {
  const found: { date: Date; span: Match }[] = []
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const plus = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n)

  const relative: [RegExp, number][] = [[r(String.raw`\b(?:i\s+)?overmorgen\b`, 'g'), 2], [r(String.raw`\bi\s*morgen\b`, 'g'), 1], [r(String.raw`\bi\s*dag\b`, 'g'), 0], [r(String.raw`\bi\s*(?:kveld|ettermiddag|formiddag)\b`, 'g'), 0]]
  for (const [re, n] of relative) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) found.push({ date: plus(n), span: { start: m.index, end: m.index + m[0].length } })
  }

  const weekday = r(`\\b(?:(?:på|neste|nå på|denne)\\s+)?(${WEEKDAYS.join('|')})(?:en)?\\b`, 'g')
  let m: RegExpExecArray | null
  while ((m = weekday.exec(text))) {
    const target = WEEKDAYS.indexOf(m[1])
    let diff = (target - today.getDay() + 7) % 7
    if (/^neste/.test(m[0]) && diff === 0) diff = 7
    found.push({ date: plus(diff), span: { start: m.index, end: m.index + m[0].length } })
  }

  // 15. oktober, 15 oktober, den 15/10, 15.10
  const named = r(`\\b(?:den\\s+)?(\\d{1,2})\\.?\\s+(${MONTHS.join('|')})\\b`, 'g')
  while ((m = named.exec(text))) {
    found.push({ date: inFuture(Number(m[1]), MONTHS.indexOf(m[2]), today), span: { start: m.index, end: m.index + m[0].length } })
  }
  const numeric = r(String.raw`\b(?:den\s+)?(\d{1,2})[./](\d{1,2})\.?(?![\d:])`, 'g')
  while ((m = numeric.exec(text))) {
    // 14.30 er et klokkeslett, ikke en dato
    if (m[0].includes('.') && Number(m[2]) > 12) continue
    if (m[0].includes('.') && r(String.raw`\bkl`).test(text.slice(Math.max(0, m.index - 8), m.index))) continue
    found.push({ date: inFuture(Number(m[1]), Number(m[2]) - 1, today), span: { start: m.index, end: m.index + m[0].length } })
  }

  const valid = found.filter(f => !Number.isNaN(f.date.getTime()))
  if (valid.length === 0) return null
  const dates = new Set(valid.map(f => ymd(f.date)))
  // «på fredag 17. oktober» nevner samme dag to ganger, og det er greit
  if (dates.size > 1) return 'many'
  return { date: ymd(valid[0].date), spans: valid.map(f => f.span) }
}

function inFuture(day: number, month: number, today: Date): Date {
  const d = new Date(today.getFullYear(), month, day)
  if (d.getMonth() !== month) return new Date(NaN)
  return d < today ? new Date(today.getFullYear() + 1, month, day) : d
}

const FILLER = r(String.raw`\b(jeg|du|vi|skal|må|have|ha|har|husk|husk å|minn meg på|minne meg på|å|til|hos|på|kl|klokka|klokken|om|den|i|en|ei|et|neste|sammen|med)\b`, 'g')

function cleanTitle(text: string, spans: Match[]): string {
  let t = text
  for (const s of [...spans].sort((a, b) => b.start - a.start)) t = t.slice(0, s.start) + ' ' + t.slice(s.end)
  t = t.replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim()
  // Fjern fyllord bare i starten og slutten, så «møte med Ola» beholder «med»
  let prev = ''
  while (prev !== t) {
    prev = t
    t = t.replace(r(`^${FILLER.source}\\s*`, 'i'), '').replace(r(`\\s*${FILLER.source}$`, 'i'), '').trim()
  }
  // «Tannlegen» blir «Tannlege», som når AI tolker
  t = t.replace(r(String.raw`^(tannlegen|legen|frisøren|psykologen|fysioterapeuten)$`, 'i'), w => w.slice(0, -1))
  return t ? t[0].toUpperCase() + t.slice(1) : ''
}

export function parseAppointmentLocally(input: string, now = new Date()): ParsedAppointment | null {
  const original = input.replace(/\s+/g, ' ').trim()
  const text = original.toLowerCase()
  // Indeksene må stemme mellom de to, så navn kan beholde stor forbokstav i tittelen
  if (!text || text.length !== original.length) return null

  const time = findTime(text)
  const date = findDate(text, now)
  if (time === 'many' || date === 'many') return null
  if (!time && !date) return null

  const title = cleanTitle(original, [...(time?.spans ?? []), ...(date?.spans ?? [])])
  // For lange titler tyder på en beskjed med mer enn én ting i seg
  if (!title || title.split(' ').length > 6 || r(String.raw`\bog\b`).test(title)) return null

  // Uten dato: i dag hvis tiden ikke har passert, ellers i morgen
  let day = date?.date
  if (!day) {
    const passed = time && time.time < `${pad(now.getHours())}:${pad(now.getMinutes())}`
    day = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (passed ? 1 : 0)))
  }

  const appointment = APPOINTMENT_WORDS.test(text)
  return {
    title,
    emoji: EMOJIS.find(([re]) => re.test(text))?.[1] ?? '\u{1F4CC}',
    date: day,
    startTime: time ? time.time : null,
    durationMinutes: appointment ? 60 : 30,
    reminderMinutes: appointment ? 30 : 10,
  }
}

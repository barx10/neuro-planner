import type { VercelRequest, VercelResponse } from '@vercel/node'

// Lager en kalenderfil (.ics) fra parameterne i lenken. Ingenting lagres.
// Egen tjeneste fordi iPhone bare åpner «Legg til i kalender» for filer som lastes fra en adresse.

const STAMP = /^\d{8}T\d{6}Z$/

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default function handler(req: VercelRequest, res: VercelResponse) {
  const title = first(req.query.title).slice(0, 200)
  const start = first(req.query.start)
  const end = first(req.query.end)
  const alarm = Number(first(req.query.alarm) || '0')

  if (!title || !STAMP.test(start) || !STAMP.test(end) || !(alarm >= 0 && alarm <= 24 * 60)) {
    return res.status(400).send('Ugyldig avtale')
  }

  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Neurominder//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${start}-${Math.random().toString(36).slice(2)}@neurominder`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(title)}`,
    ...(alarm > 0
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(title)}`, `TRIGGER:-PT${Math.round(alarm)}M`, 'END:VALARM']
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="avtale.ics"')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(lines.join('\r\n') + '\r\n')
}

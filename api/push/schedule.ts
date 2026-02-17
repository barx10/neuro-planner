import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { notifications } = req.body
  if (!Array.isArray(notifications)) {
    return res.status(400).json({ error: 'Invalid notifications array' })
  }

  await redis.set('push:schedule', notifications)
  // Reset sent tracking for new schedule
  await redis.del('push:sent')

  res.status(200).json({ ok: true, count: notifications.length })
}

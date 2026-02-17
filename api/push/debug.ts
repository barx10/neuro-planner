import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const subscription = await redis.get('push:subscription')
  const schedule = await redis.get('push:schedule')
  const sent = await redis.get('push:sent')

  res.status(200).json({
    hasSubscription: !!subscription,
    schedule,
    sent,
    serverTime: new Date().toISOString(),
  })
}

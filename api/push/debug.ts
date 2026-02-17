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

  const sub = subscription as Record<string, unknown> | null
  const keys = (sub as { keys?: Record<string, unknown> })?.keys
  res.status(200).json({
    subscriptionType: typeof subscription,
    subscriptionKeys: sub ? Object.keys(sub) : null,
    hasEndpoint: !!(sub as { endpoint?: string })?.endpoint,
    endpointPreview: ((sub as { endpoint?: string })?.endpoint || '').slice(-20),
    hasAuthKey: !!keys?.auth,
    hasP256dh: !!keys?.p256dh,
    schedule,
    sent,
    serverTime: new Date().toISOString(),
  })
}

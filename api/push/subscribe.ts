import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const subscription = req.body
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' })
  }

  if (!subscription?.keys?.auth || !subscription?.keys?.p256dh) {
    return res.status(400).json({ error: 'Subscription missing auth/p256dh keys' })
  }

  await redis.set('push:subscription', subscription)
  res.status(200).json({ ok: true })
}

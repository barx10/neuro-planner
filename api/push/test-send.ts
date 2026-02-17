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

  try {
    const webpushModule = await import('web-push')
    const webpush = webpushModule.default || webpushModule
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const subscription = await redis.get('push:subscription') as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    } | null

    if (!subscription) {
      return res.status(200).json({ error: 'No subscription' })
    }

    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: '🧪 Test fra Neurominder',
        body: 'Push-varsling fungerer!',
        tag: 'test',
        icon: '/icon.png',
      })
    )

    res.status(200).json({ ok: true, statusCode: result.statusCode })
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string; body?: string }
    res.status(200).json({
      error: error.message,
      statusCode: error.statusCode,
      body: error.body,
    })
  }
}

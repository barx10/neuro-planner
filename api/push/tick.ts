import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

interface ScheduledNotification {
  id: string
  time: string
  title: string
  body: string
  emoji: string
  tag: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Dynamic import to avoid bundling issues
    const webpush = await import('web-push')
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const subJson = await redis.get<string>('push:subscription')
    const scheduleJson = await redis.get<string>('push:schedule')

    if (!subJson || !scheduleJson) {
      return res.status(200).json({ sent: 0, reason: 'No subscription or schedule' })
    }

    const subscription = typeof subJson === 'string' ? JSON.parse(subJson) : subJson
    const schedule: ScheduledNotification[] = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson
    const sentSet: string[] = (await redis.get<string[]>('push:sent')) || []

    const now = Date.now()
    let sentCount = 0

    for (const notif of schedule) {
      const notifTime = new Date(notif.time).getTime()
      if (notifTime <= now && !sentSet.includes(notif.id)) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `${notif.emoji} ${notif.title}`,
              body: notif.body,
              tag: notif.tag,
              icon: '/icon.png',
            })
          )
          sentSet.push(notif.id)
          sentCount++
        } catch (err: unknown) {
          const error = err as { statusCode?: number }
          if (error.statusCode === 410) {
            await redis.del('push:subscription')
            return res.status(200).json({ sent: sentCount, error: 'Subscription expired' })
          }
        }
      }
    }

    if (sentCount > 0) {
      await redis.set('push:sent', JSON.stringify(sentSet))
    }

    res.status(200).json({ sent: sentCount })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : ''
    res.status(500).json({ error: message, stack })
  }
}

import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'
import type { BlockedPeriod } from '../types'

export function useDayOverride(date: string) {
  const [override, setOverride] = useState<{ date: string; blockedPeriod: BlockedPeriod | null } | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const row = await db.dayOverrides.get(date)
    setOverride(row)
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])

  const setDayFree = async () => {
    await db.dayOverrides.put({ date, blockedPeriod: null })
    await load()
  }

  const setDayBlocked = async (period: BlockedPeriod) => {
    await db.dayOverrides.put({ date, blockedPeriod: period })
    await load()
  }

  const clearOverride = async () => {
    await db.dayOverrides.delete(date)
    await load()
  }

  return { override, loading, setDayFree, setDayBlocked, clearOverride }
}

"use client"

import { useEffect, useState } from "react"
import { SITE_CONFIG } from "@/lib/config"
import type { GovDataPayload } from "@/app/api/gov/route"

interface UseGovDataResult {
  data: GovDataPayload | null
  loading: boolean
  error: string | null
}

/** Government Data Center feeds (TMD + ThaiWater), polled on a slow cadence —
 * the server caches upstream responses so this is cheap to refresh. */
export function useGovData(): UseGovDataResult {
  const [data, setData] = useState<GovDataPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/gov", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to load government data (${res.status})`)
        const payload = (await res.json()) as GovDataPayload
        if (cancelled) return
        setData(payload)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load government data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, SITE_CONFIG.fetch.govRefreshIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { data, loading, error }
}

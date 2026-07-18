"use client"

import { useEffect, useState } from "react"
import { SITE_CONFIG } from "@/lib/config"
import type { TMDWarningData } from "@/lib/weather/tmd-warning"

interface UseTMDWarningResult {
  warning: TMDWarningData | null
  loading: boolean
  error: string | null
}

export function useTMDWarning(): UseTMDWarningResult {
  const [warning, setWarning] = useState<TMDWarningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/weather/warning", { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? "Failed to load warning")
        setWarning(data)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load warning")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, SITE_CONFIG.fetch.tmdWarningRefreshIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { warning, loading, error }
}

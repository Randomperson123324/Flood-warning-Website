"use client"

import { useEffect, useState } from "react"
import { SITE_CONFIG } from "@/lib/config"
import type { GovNearbyStation } from "@/lib/gov/thaiwater"
import type { UserLocation } from "@/types"

interface UseNearbyGovStationsResult {
  stations: GovNearbyStation[]
  loading: boolean
  error: string | null
}

/** Nearest HII (ThaiWater) rain stations to the visitor. Only fetches for a
 * real GPS fix — IP/fallback locations are too coarse for a "near you" list
 * to be honest, so those callers get an empty result without a request. */
export function useNearbyGovStations(location: UserLocation | null): UseNearbyGovStationsResult {
  const [stations, setStations] = useState<GovNearbyStation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lat = location?.source === "gps" ? location.lat : null
  const lon = location?.source === "gps" ? location.lon : null

  useEffect(() => {
    if (lat === null || lon === null) {
      setStations([])
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/gov/nearby?lat=${lat}&lon=${lon}`, { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? "Failed to load nearby stations")
        setStations(data.stations ?? [])
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load nearby stations")
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
  }, [lat, lon])

  return { stations, loading, error }
}

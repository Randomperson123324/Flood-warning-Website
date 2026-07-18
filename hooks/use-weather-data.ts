"use client"

import { useEffect, useState } from "react"
import { SITE_CONFIG } from "@/lib/config"
import type { Sensor, WeatherData } from "@/types"

interface UseWeatherResult {
  weather: WeatherData | null
  loading: boolean
  error: string | null
}

export function useWeatherData(sensor: Sensor | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable primitive deps — the parent's sensor object identity changes on
  // every periodic sensors re-fetch, which would otherwise reset the refresh
  // interval and re-request weather far more often than configured.
  const lat = sensor?.lat ?? null
  const lon = sensor?.lon ?? null
  const label = sensor?.label ?? ""

  useEffect(() => {
    if (lat === null || lon === null) return
    let cancelled = false
    let initial = true

    async function load() {
      if (initial) setLoading(true)
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          label,
        })
        const res = await fetch(`/api/weather?${params.toString()}`, { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? "Failed to load weather")
        setWeather(data)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load weather")
      } finally {
        if (!cancelled) setLoading(false)
        initial = false
      }
    }

    load()
    const interval = setInterval(load, SITE_CONFIG.fetch.weatherRefreshIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lat, lon, label])

  return { weather, loading, error }
}

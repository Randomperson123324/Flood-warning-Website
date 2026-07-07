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

  useEffect(() => {
    if (!sensor) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          lat: String(sensor!.lat),
          lon: String(sensor!.lon),
          label: sensor!.label,
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
      }
    }

    load()
    const interval = setInterval(load, SITE_CONFIG.fetch.weatherRefreshIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sensor])

  return { weather, loading, error }
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { SITE_CONFIG } from "@/lib/config"
import { haversineDistanceKm } from "@/lib/utils"
import type { Sensor, SensorWithDistance, UserLocation } from "@/types"

interface UseSensorsResult {
  sensors: Sensor[]
  /** Sensors sorted by distance to `location`, or by label if location is unknown. */
  sensorsByDistance: SensorWithDistance[]
  /** Nearest sensor to `location`; first sensor (alphabetical) if location is unknown. */
  recommendedSensor: Sensor | null
  loading: boolean
  error: string | null
}

export function useSensors(location: UserLocation | null): UseSensorsResult {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let initial = true

    async function load() {
      if (!supabase) {
        setError("Supabase is not configured")
        setLoading(false)
        return
      }
      // Only surface a loading state on the first fetch — periodic refreshes
      // should update data silently instead of flickering the UI.
      if (initial) setLoading(true)
      const { data, error: queryError } = await supabase
        .from("sensors")
        .select("*")
        .eq("is_active", true)
        .order("label", { ascending: true })

      if (cancelled) return
      if (queryError) {
        setError(queryError.message)
      } else {
        setSensors(data ?? [])
        setError(null)
      }
      setLoading(false)
      initial = false
    }

    load()
    const interval = setInterval(load, SITE_CONFIG.fetch.sensorsRefreshIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const sensorsByDistance = useMemo<SensorWithDistance[]>(() => {
    if (!location) {
      return sensors.map((s) => ({ ...s, distanceKm: Number.POSITIVE_INFINITY }))
    }
    return [...sensors]
      .map((s) => ({ ...s, distanceKm: haversineDistanceKm(location, { lat: s.lat, lon: s.lon }) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }, [sensors, location])

  const recommendedSensor = useMemo<Sensor | null>(() => {
    if (location && sensorsByDistance.length > 0) return sensorsByDistance[0]
    return sensors[0] ?? null
  }, [sensors, sensorsByDistance, location])

  return { sensors, sensorsByDistance, recommendedSensor, loading, error }
}

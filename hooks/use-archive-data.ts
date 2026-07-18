"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { SITE_CONFIG } from "@/lib/config"
import type { Sensor, WaterReading } from "@/types"

interface UseArchiveDataResult {
  readings: WaterReading[]
  loading: boolean
  error: string | null
}

/** Readings for one sensor on one calendar day (`date` = "YYYY-MM-DD" in the
 * visitor's local timezone) — powers the Archives page. Unlike useWaterData
 * this is a one-shot historical query: no realtime subscription needed. */
export function useArchiveData(sensor: Sensor | null, date: string): UseArchiveDataResult {
  const [readings, setReadings] = useState<WaterReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sensorId = sensor?.sensor_id ?? null

  useEffect(() => {
    if (!sensorId || !date) return
    if (!supabase) {
      setError("Supabase is not configured")
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      // "T00:00:00" (no zone suffix) parses as LOCAL midnight, so the day
      // boundaries match the visitor's clock rather than UTC.
      const start = new Date(`${date}T00:00:00`)
      const end = new Date(start.getTime() + 86_400_000)

      const { data, error: queryError } = await supabase!
        .from("water_readings")
        .select("*")
        .eq("sensor_id", sensorId!)
        .gte("timestamp", start.toISOString())
        .lt("timestamp", end.toISOString())
        .order("timestamp", { ascending: true })
        .limit(SITE_CONFIG.fetch.archiveDayLimit)

      if (cancelled) return
      if (queryError) {
        setError(queryError.message)
      } else {
        setReadings(data ?? [])
        setError(null)
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [sensorId, date])

  return { readings, loading, error }
}

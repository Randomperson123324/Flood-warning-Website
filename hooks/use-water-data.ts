"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { SITE_CONFIG } from "@/lib/config"
import { uniqueId } from "@/lib/utils"
import { computeRatePerHour, computeSeverity, computeTimeToThreshold, computeTrend } from "@/lib/water-analysis"
import type { Sensor, WaterReading } from "@/types"

interface UseWaterDataResult {
  latest: WaterReading | null
  history: WaterReading[]
  ratePerHour: number
  trend: ReturnType<typeof computeTrend>
  severity: ReturnType<typeof computeSeverity> | null
  timeToThreshold: ReturnType<typeof computeTimeToThreshold> | null
  loading: boolean
  error: string | null
}

/** Readings used for the regression/trend window — recent enough to reflect
 * the current trend without being noisy from a single blip. */
const TREND_WINDOW_HOURS = 3

export function useWaterData(sensor: Sensor | null): UseWaterDataResult {
  const [history, setHistory] = useState<WaterReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sensor) return
    if (!supabase) {
      setError("Supabase is not configured")
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      const since = new Date(Date.now() - SITE_CONFIG.fetch.historyDays * 86_400_000).toISOString()
      const { data, error: queryError } = await supabase!
        .from("water_readings")
        .select("*")
        .eq("sensor_id", sensor!.sensor_id)
        .gte("timestamp", since)
        .order("timestamp", { ascending: true })
        .limit(SITE_CONFIG.fetch.realtimeLimit)

      if (cancelled) return
      if (queryError) {
        setError(queryError.message)
      } else {
        setHistory(data ?? [])
        setError(null)
      }
      setLoading(false)
    }

    loadHistory()

    const channel = supabase
      .channel(`water_readings:${sensor.sensor_id}:${uniqueId()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "water_readings", filter: `sensor_id=eq.${sensor.sensor_id}` },
        (payload) => {
          setHistory((prev) => [...prev, payload.new as WaterReading])
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
  }, [sensor])

  const latest = history.length > 0 ? history[history.length - 1] : null

  const trendWindow = useMemo(() => {
    const since = Date.now() - TREND_WINDOW_HOURS * 3_600_000
    return history.filter((r) => new Date(r.timestamp).getTime() >= since)
  }, [history])

  const ratePerHour = useMemo(() => computeRatePerHour(trendWindow), [trendWindow])
  const trend = useMemo(() => computeTrend(ratePerHour), [ratePerHour])

  const severity = latest && sensor ? computeSeverity(latest.level, sensor.warning_level_cm, sensor.danger_level_cm) : null

  const timeToThreshold =
    latest && sensor ? computeTimeToThreshold(latest.level, ratePerHour, sensor.warning_level_cm, sensor.danger_level_cm) : null

  return { latest, history, ratePerHour, trend, severity, timeToThreshold, loading, error }
}

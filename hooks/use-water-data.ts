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

  // Depend on the stable sensor_id (not the object) — useSensors re-fetches
  // its list periodically and produces brand-new objects each time, which
  // would otherwise tear down the realtime channel and re-fetch the entire
  // history every few minutes for the exact same sensor.
  const sensorId = sensor?.sensor_id ?? null

  useEffect(() => {
    if (!sensorId) return
    if (!supabase) {
      setError("Supabase is not configured")
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      const since = new Date(Date.now() - SITE_CONFIG.fetch.historyDays * 86_400_000).toISOString()
      // Order newest-first so the row limit keeps the MOST recent readings
      // (ascending + limit would keep the oldest N and drop new ones, making
      // `latest` stale). Reverse to ascending afterwards for chart/trend math.
      const { data, error: queryError } = await supabase!
        .from("water_readings")
        .select("*")
        .eq("sensor_id", sensorId!)
        .gte("timestamp", since)
        .order("timestamp", { ascending: false })
        .limit(SITE_CONFIG.fetch.realtimeLimit)

      if (cancelled) return
      if (queryError) {
        setError(queryError.message)
      } else {
        setHistory((data ?? []).slice().reverse())
        setError(null)
      }
      setLoading(false)
    }

    loadHistory()

    const channel = supabase
      .channel(`water_readings:${sensorId}:${uniqueId()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "water_readings", filter: `sensor_id=eq.${sensorId}` },
        (payload) => {
          const reading = payload.new as WaterReading
          setHistory((prev) => {
            // Dedupe (channel rejoins can replay events) and cap growth so a
            // long-lived tab doesn't accumulate readings without bound.
            if (prev.some((r) => r.id === reading.id)) return prev
            const next = [...prev, reading]
            const cap = SITE_CONFIG.fetch.realtimeLimit
            return next.length > cap ? next.slice(next.length - cap) : next
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
  }, [sensorId])

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

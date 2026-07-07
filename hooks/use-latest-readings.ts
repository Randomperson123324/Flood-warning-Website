"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { SITE_CONFIG } from "@/lib/config"
import type { WaterReading } from "@/types"

/** Latest reading per sensor_id — used to color map markers by severity
 * without each marker running its own query. */
export function useLatestReadings(sensorIds: string[]): Record<string, WaterReading | undefined> {
  const [latestBySensorId, setLatestBySensorId] = useState<Record<string, WaterReading | undefined>>({})

  useEffect(() => {
    if (!supabase || sensorIds.length === 0) return
    let cancelled = false

    async function load() {
      // Pull a generous recent window and reduce client-side to "first seen
      // per sensor_id" (rows are already newest-first) — avoids N separate
      // queries for N sensors.
      const { data } = await supabase!
        .from("water_readings")
        .select("*")
        .in("sensor_id", sensorIds)
        .order("timestamp", { ascending: false })
        .limit(500)

      if (cancelled || !data) return
      const map: Record<string, WaterReading> = {}
      for (const reading of data as WaterReading[]) {
        if (!map[reading.sensor_id]) map[reading.sensor_id] = reading
      }
      setLatestBySensorId(map)
    }

    load()
    const interval = setInterval(load, SITE_CONFIG.fetch.waterRefreshIntervalMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorIds.join(",")])

  return latestBySensorId
}

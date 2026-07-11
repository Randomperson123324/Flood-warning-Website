"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"
import { SITE_CONFIG } from "@/lib/config"
import { computeSeverity } from "@/lib/water-analysis"
import type { Sensor, WarningSeverity, WaterReading } from "@/types"

type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied"

interface AlertWatcherContextValue {
  permission: NotificationPermissionState
  requestPermission: () => Promise<void>
  /** Current severity per sensor_id — reused by the Notifications page so it
   * doesn't need its own polling loop. */
  severityBySensor: Record<string, WarningSeverity>
  sensors: Sensor[]
}

const AlertWatcherContext = createContext<AlertWatcherContextValue | null>(null)

export function AlertWatcherProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported")
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [severityBySensor, setSeverityBySensor] = useState<Record<string, WarningSeverity>>({})
  const previousSeverity = useRef<Record<string, WarningSeverity>>({})

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission as NotificationPermissionState)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function poll() {
      const { data: sensorData } = await supabase!.from("sensors").select("*").eq("is_active", true)
      if (cancelled || !sensorData) return
      setSensors(sensorData as Sensor[])

      const sensorIds = (sensorData as Sensor[]).map((s) => s.sensor_id)
      if (sensorIds.length === 0) return

      const { data: readingData } = await supabase!
        .from("water_readings")
        .select("*")
        .in("sensor_id", sensorIds)
        .order("timestamp", { ascending: false })
        .limit(500)

      if (cancelled || !readingData) return

      const latestBySensor: Record<string, WaterReading> = {}
      for (const reading of readingData as WaterReading[]) {
        if (!latestBySensor[reading.sensor_id]) latestBySensor[reading.sensor_id] = reading
      }

      const nextSeverity: Record<string, WarningSeverity> = {}
      for (const sensor of sensorData as Sensor[]) {
        const reading = latestBySensor[sensor.sensor_id]
        if (!reading) continue
        nextSeverity[sensor.sensor_id] = computeSeverity(reading.level, sensor.warning_level_cm, sensor.danger_level_cm)
      }

      // Fire a browser notification only on escalation (normal→warning,
      // warning→danger, normal→danger) — never on de-escalation or on the
      // very first poll (no baseline to compare against yet).
      if (Notification?.permission === "granted") {
        for (const sensor of sensorData as Sensor[]) {
          const prev = previousSeverity.current[sensor.sensor_id]
          const next = nextSeverity[sensor.sensor_id]
          if (prev && next && next !== prev && severityRank(next) > severityRank(prev)) {
            new Notification(`${sensor.label}: ${severityLabelTh(next)}`, {
              body: `ระดับน้ำ ${latestBySensor[sensor.sensor_id]?.level.toFixed(1)} cm`,
              tag: sensor.sensor_id,
            })
          }
        }
      }

      previousSeverity.current = nextSeverity
      setSeverityBySensor(nextSeverity)
    }

    poll()
    const interval = setInterval(poll, SITE_CONFIG.fetch.waterRefreshIntervalMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return
    const result = await Notification.requestPermission()
    setPermission(result as NotificationPermissionState)
  }

  const value = useMemo<AlertWatcherContextValue>(
    () => ({ permission, requestPermission, severityBySensor, sensors }),
    [permission, severityBySensor, sensors],
  )

  return <AlertWatcherContext.Provider value={value}>{children}</AlertWatcherContext.Provider>
}

export function useAlertWatcher(): AlertWatcherContextValue {
  const ctx = useContext(AlertWatcherContext)
  if (!ctx) throw new Error("useAlertWatcher must be used within AlertWatcherProvider")
  return ctx
}

function severityRank(s: WarningSeverity): number {
  return s === "danger" ? 2 : s === "warning" ? 1 : 0
}

function severityLabelTh(s: WarningSeverity): string {
  return s === "danger" ? "อันตราย" : s === "warning" ? "เฝ้าระวัง" : "ปกติ"
}

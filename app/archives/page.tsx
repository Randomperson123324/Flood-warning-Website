"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Clock, Waves } from "lucide-react"
import { Header } from "@/components/header"
import { SensorSelector } from "@/components/dashboard/sensor-selector"
import { WaterLevelChart } from "@/components/dashboard/water-level-chart"
import { useSensors } from "@/hooks/use-sensors"
import { useArchiveData } from "@/hooks/use-archive-data"
import { useLanguage } from "@/hooks/use-language"
import { computeSeverity } from "@/lib/water-analysis"
import { glassInputClass } from "@/components/auth/auth-shell"
import type { WarningSeverity } from "@/types"

const SEVERITY_TEXT: Record<WarningSeverity, string> = {
  normal: "text-status-normal",
  warning: "text-status-warning",
  danger: "text-status-danger",
}

/** Today as a value for <input type="date"> — must be the LOCAL date, since
 * toISOString() would shift to yesterday/tomorrow near midnight in UTC+7. */
function toLocalDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function ArchivesPage() {
  const { t, locale } = useLanguage()
  const { sensors, sensorsByDistance, recommendedSensor, loading: sensorsLoading } = useSensors(null)

  const [manualSensorId, setManualSensorId] = useState<string | null>(null)
  const selectedSensor = useMemo(
    () => sensors.find((s) => s.sensor_id === manualSensorId) ?? recommendedSensor,
    [sensors, manualSensorId, recommendedSensor],
  )

  const today = toLocalDateInputValue(new Date())
  const [date, setDate] = useState(today)

  const { readings, loading, error } = useArchiveData(selectedSensor ?? null, date)

  // Slider position over the day's readings; null = "end of day" so switching
  // date/sensor lands on the last reading instead of a stale index.
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const selectedIndex = readings.length === 0 ? -1 : Math.min(timeIndex ?? readings.length - 1, readings.length - 1)
  const selectedReading = selectedIndex >= 0 ? readings[selectedIndex] : null

  const stats = useMemo(() => {
    if (readings.length === 0) return null
    const levels = readings.map((r) => r.level)
    return {
      min: Math.min(...levels),
      max: Math.max(...levels),
      avg: levels.reduce((sum, l) => sum + l, 0) / levels.length,
    }
  }, [readings])

  const severity =
    selectedReading && selectedSensor
      ? computeSeverity(selectedReading.level, selectedSensor.warning_level_cm, selectedSensor.danger_level_cm)
      : null

  const timeFormatter = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <main className="min-h-dvh pb-16">
      <Header />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <div className="glass-panel animate-fade-in-up p-5">
          <h1 className="text-lg font-semibold tracking-tight">{t("archives", "title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("archives", "subtitle")}</p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft">{t("sensor", "select")}</label>
              <SensorSelector
                sensors={sensorsByDistance}
                selectedSensorId={selectedSensor?.sensor_id ?? null}
                onSelect={(id) => {
                  setManualSensorId(id)
                  setTimeIndex(null)
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="archive-date" className="text-xs font-medium text-ink-soft">
                {t("archives", "selectDate")}
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                <input
                  id="archive-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => {
                    if (!e.target.value) return
                    setDate(e.target.value)
                    setTimeIndex(null)
                  }}
                  className={`${glassInputClass} w-auto pl-9`}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="glass-panel p-4 text-sm text-status-danger">{error}</div>}

        {(loading || sensorsLoading) && !error ? (
          <div className="glass-panel h-40 animate-pulse" />
        ) : readings.length === 0 ? (
          !error && (
            <div className="glass-panel flex h-40 flex-col items-center justify-center gap-2 text-sm text-ink-soft">
              <Waves className="h-6 w-6 text-accent/70" />
              <span>{t("archives", "noData")}</span>
            </div>
          )
        ) : (
          <>
            <div className="glass-panel animate-fade-in-up p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-soft">
                <Clock className="h-4 w-4 text-accent" />
                {t("archives", "selectTime")}
              </div>

              <input
                type="range"
                min={0}
                max={readings.length - 1}
                value={selectedIndex}
                onChange={(e) => setTimeIndex(Number(e.target.value))}
                aria-label={t("archives", "selectTime")}
                className="w-full cursor-pointer"
                style={{ accentColor: "rgb(var(--accent-rgb))" }}
              />
              <div className="mt-1 flex justify-between text-xs text-ink-soft">
                <span>{timeFormatter(readings[0].timestamp)}</span>
                <span>{timeFormatter(readings[readings.length - 1].timestamp)}</span>
              </div>

              {selectedReading && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-ink-soft">
                      {t("archives", "levelAtTime")} · {timeFormatter(selectedReading.timestamp)}
                    </p>
                    <p className={`text-3xl font-semibold tracking-tight ${severity ? SEVERITY_TEXT[severity] : ""}`}>
                      {selectedReading.level.toFixed(1)} <span className="text-base font-medium">cm</span>
                    </p>
                    {severity && (
                      <p className={`text-sm font-medium ${SEVERITY_TEXT[severity]}`}>{t("status", severity)}</p>
                    )}
                  </div>

                  {stats && (
                    <div className="flex gap-3">
                      {(
                        [
                          ["min", stats.min],
                          ["max", stats.max],
                          ["avg", stats.avg],
                        ] as const
                      ).map(([key, value]) => (
                        <div key={key} className="glass-panel-strong px-4 py-2.5 text-center">
                          <p className="text-xs text-ink-soft">{t("archives", key)}</p>
                          <p className="text-sm font-semibold">{value.toFixed(1)} cm</p>
                        </div>
                      ))}
                      <div className="glass-panel-strong px-4 py-2.5 text-center">
                        <p className="text-xs text-ink-soft">{t("archives", "readingCount")}</p>
                        <p className="text-sm font-semibold">{readings.length}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedSensor && (
              <div className="animate-fade-in-up delay-75">
                <WaterLevelChart sensor={selectedSensor} history={readings} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

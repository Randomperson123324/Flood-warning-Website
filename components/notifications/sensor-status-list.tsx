"use client"

import { CheckCircle2, TriangleAlert } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAlertWatcher } from "@/hooks/use-browser-notifications"
import { cn } from "@/lib/utils"
import type { WarningSeverity } from "@/types"

const SEVERITY_CLASS: Record<WarningSeverity, string> = {
  normal: "text-status-normal",
  warning: "text-status-warning",
  danger: "text-status-danger",
}

export function SensorStatusList() {
  const { t } = useLanguage()
  const { sensors, severityBySensor } = useAlertWatcher()

  const atRisk = sensors.filter((s) => severityBySensor[s.sensor_id] && severityBySensor[s.sensor_id] !== "normal")

  return (
    <div className="glass-panel animate-fade-in-up p-5">
      <p className="mb-3 text-sm font-medium text-ink-soft">{t("notifications", "sensorStatus")}</p>

      {atRisk.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-sm text-status-normal">
          <CheckCircle2 className="h-4 w-4" />
          {t("notifications", "noAlerts")}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {atRisk.map((sensor) => {
            const severity = severityBySensor[sensor.sensor_id]
            return (
              <div key={sensor.sensor_id} className="glass-panel-strong flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <TriangleAlert className={cn("h-4 w-4", SEVERITY_CLASS[severity])} />
                  {sensor.label}
                </span>
                <span className={cn("font-medium", SEVERITY_CLASS[severity])}>{t("status", severity)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

"use client"

import { ArrowDown, ArrowRight, ArrowUp, Clock } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { LiquidGauge } from "@/components/dashboard/liquid-gauge"
import { cn } from "@/lib/utils"
import type { Sensor, TimeToThreshold, WarningSeverity, WaterTrend } from "@/types"

interface CurrentStatusCardProps {
  sensor: Sensor
  levelCm: number | null
  ratePerHour: number
  trend: WaterTrend
  severity: WarningSeverity | null
  timeToThreshold: TimeToThreshold | null
  lastUpdated: string | null
}

const TREND_ICON: Record<WaterTrend, typeof ArrowUp> = {
  rising: ArrowUp,
  falling: ArrowDown,
  stable: ArrowRight,
}

const SEVERITY_TEXT_CLASS: Record<WarningSeverity, string> = {
  normal: "text-status-normal",
  warning: "text-status-warning",
  danger: "text-status-danger",
}

export function CurrentStatusCard({
  sensor,
  levelCm,
  ratePerHour,
  trend,
  severity,
  timeToThreshold,
  lastUpdated,
}: CurrentStatusCardProps) {
  const { t, locale } = useLanguage()
  const TrendIcon = TREND_ICON[trend]

  if (levelCm === null) {
    return (
      <div className="glass-panel flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center text-ink-soft">
        <span className="glass-panel-strong flex h-12 w-12 items-center justify-center rounded-full">
          <Clock className="h-5 w-5 animate-pulse text-accent" />
        </span>
        <div>
          <p className="font-medium text-ink">{t("status", "noData")}</p>
          <p className="mt-1 text-sm">{sensor.label}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8">
      <LiquidGauge
        levelCm={levelCm}
        warningCm={sensor.warning_level_cm}
        dangerCm={sensor.danger_level_cm}
        severity={severity ?? "normal"}
      />

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-sm text-ink-soft">{t("status", "currentLevel")} · {sensor.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn("font-mono text-5xl font-semibold tabular-nums", severity && SEVERITY_TEXT_CLASS[severity])}>
              {levelCm.toFixed(1)}
            </span>
            <span className="text-lg text-ink-soft">cm</span>
            {severity && (
              <span className={cn("glass-panel-strong ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium", SEVERITY_TEXT_CLASS[severity])}>
                {t("status", severity)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-ink-soft">
            <TrendIcon className={cn("h-4 w-4", trend === "rising" && "text-status-danger", trend === "falling" && "text-status-normal")} />
            <span>{t("status", trend)}</span>
            <span className="font-mono tabular-nums">
              ({ratePerHour > 0 ? "+" : ""}
              {ratePerHour.toFixed(2)} cm/h)
            </span>
          </div>

          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-ink-soft">
              <Clock className="h-4 w-4" />
              <span>{t("status", "lastUpdated")}</span>
              <span className="font-mono">{new Date(lastUpdated).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US")}</span>
            </div>
          )}
        </div>

        {timeToThreshold && !timeToThreshold.isStable && (
          <p className="text-sm text-ink-soft">
            {t("status", timeToThreshold.targetLabel === "warning" ? "timeToWarning" : "timeToDanger")}:{" "}
            <span className="font-mono font-medium text-ink">
              {timeToThreshold.days ? `${timeToThreshold.days}${locale === "th" ? "ว " : "d "}` : ""}
              {timeToThreshold.hours}
              {locale === "th" ? "ชม " : "h "}
              {timeToThreshold.minutes}
              {locale === "th" ? "นาที" : "m"}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

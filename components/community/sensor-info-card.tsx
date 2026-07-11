"use client"

import { ArrowDown, ArrowRight, ArrowUp, Clock, Gauge, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useWaterData } from "@/hooks/use-water-data"
import { LiquidGauge } from "@/components/dashboard/liquid-gauge"
import { cn } from "@/lib/utils"
import type { Sensor, WaterTrend } from "@/types"

interface SensorInfoCardProps {
  sensor: Sensor
  username?: string
  time?: string
  isMine?: boolean
  onDismiss?: () => void
}

const TREND_ICON: Record<WaterTrend, typeof ArrowUp> = {
  rising: ArrowUp,
  falling: ArrowDown,
  stable: ArrowRight,
}

const SEVERITY_TEXT_CLASS = {
  normal: "text-status-normal",
  warning: "text-status-warning",
  danger: "text-status-danger",
} as const

/** Read-only sensor snapshot summoned by the community chat's `/sensor`
 * command — renders inline in the message feed (like the `/AI` exchange
 * bubbles), not as a popup, so it reads as part of the conversation. */
export function SensorInfoCard({ sensor, username, time, isMine, onDismiss }: SensorInfoCardProps) {
  const { t, locale } = useLanguage()
  const water = useWaterData(sensor)

  const TrendIcon = TREND_ICON[water.trend]
  const levelCm = water.latest?.level ?? null

  return (
    <div className={cn("flex animate-fade-in-up flex-col gap-1", isMine ? "items-end" : "items-start")}>
      <div className="flex items-baseline gap-1.5 px-1 text-xs text-ink-soft">
        <Gauge className="h-3.5 w-3.5 shrink-0 self-center text-accent" />
        <span className="font-medium text-accent">/sensor</span>
        {username && (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-ink">{username}</span>
          </>
        )}
        {time && <span>{time}</span>}
      </div>

      <div className="glass-panel-strong relative flex w-full max-w-sm flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{sensor.label}</h3>
          {onDismiss && (
            <button type="button" onClick={onDismiss} aria-label={t("sensor", "close")} className="glass-interactive -m-1 rounded-full p-1 text-ink-soft">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {levelCm === null ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center text-ink-soft">
            <Clock className="h-5 w-5 animate-pulse text-accent" />
            <p className="text-sm">{water.loading ? t("common", "loading") : t("status", "noData")}</p>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <LiquidGauge
              levelCm={levelCm}
              warningCm={sensor.warning_level_cm}
              dangerCm={sensor.danger_level_cm}
              severity={water.severity ?? "normal"}
              className="h-28 w-14 shrink-0"
            />

            <div className="flex flex-1 flex-col gap-2.5">
              <div>
                <p className="text-xs text-ink-soft">{t("status", "currentLevel")}</p>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className={cn("font-mono text-2xl font-semibold tabular-nums", water.severity && SEVERITY_TEXT_CLASS[water.severity])}>
                    {levelCm.toFixed(1)}
                  </span>
                  <span className="text-xs text-ink-soft">cm</span>
                </div>
                {water.severity && (
                  <span className={cn("glass-panel-strong mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", SEVERITY_TEXT_CLASS[water.severity])}>
                    {t("status", water.severity)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                <TrendIcon className={cn("h-3.5 w-3.5", water.trend === "rising" && "text-status-danger", water.trend === "falling" && "text-status-normal")} />
                <span>{t("status", water.trend)}</span>
                <span className="font-mono tabular-nums">
                  ({water.ratePerHour > 0 ? "+" : ""}
                  {water.ratePerHour.toFixed(2)} cm/h)
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/10 pt-3 text-xs text-ink-soft">
          <span>
            {t("sensor", "warningLevel")}: <span className="font-mono font-medium text-status-warning">{sensor.warning_level_cm} cm</span>
          </span>
          <span>
            {t("sensor", "dangerLevel")}: <span className="font-mono font-medium text-status-danger">{sensor.danger_level_cm} cm</span>
          </span>
        </div>

        {water.latest?.timestamp && (
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Clock className="h-3.5 w-3.5" />
            <span>{t("status", "lastUpdated")}</span>
            <span className="font-mono">{new Date(water.latest.timestamp).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US")}</span>
          </div>
        )}
      </div>
    </div>
  )
}

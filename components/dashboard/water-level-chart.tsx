"use client"

import { useMemo } from "react"
import { Waves } from "lucide-react"
import { Area, AreaChart, Brush, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLanguage } from "@/hooks/use-language"
import type { Sensor, WaterReading } from "@/types"

interface WaterLevelChartProps {
  sensor: Sensor
  history: WaterReading[]
}

export function WaterLevelChart({ sensor, history }: WaterLevelChartProps) {
  const { t, locale } = useLanguage()

  const data = useMemo(
    () =>
      history.map((r) => ({
        time: new Date(r.timestamp).getTime(),
        level: r.level,
      })),
    [history],
  )

  const timeFormatter = (value: number) =>
    new Date(value).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="glass-panel p-5">
      <p className="mb-3 text-sm font-medium text-ink-soft">{t("chart", "title")}</p>

      {data.length < 2 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-ink-soft">
          <Waves className="h-6 w-6 text-accent/70" />
          <span>{t("status", "noData")}</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="levelFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeOpacity={0.08} vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={timeFormatter}
              tick={{ fontSize: 11, fill: "rgb(var(--ink-soft-rgb))" }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "rgb(var(--ink-soft-rgb))" }}
              tickLine={false}
              axisLine={false}
              width={40}
              unit=" cm"
            />
            <Tooltip
              labelFormatter={(value) => timeFormatter(Number(value))}
              formatter={(value: number) => [`${value.toFixed(1)} cm`, t("status", "currentLevel")]}
              contentStyle={{
                background: "rgb(var(--surface-strong-rgb) / 0.9)",
                border: "1px solid rgb(var(--border-rgb) / 0.15)",
                borderRadius: 12,
                backdropFilter: "blur(12px)",
              }}
            />
            <ReferenceLine y={sensor.warning_level_cm} stroke="rgb(var(--status-warning-rgb))" strokeDasharray="4 4" />
            <ReferenceLine y={sensor.danger_level_cm} stroke="rgb(var(--status-danger-rgb))" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="level" stroke="rgb(var(--accent-rgb))" strokeWidth={2} fill="url(#levelFill)" />
            <Brush
              dataKey="time"
              height={22}
              travellerWidth={8}
              tickFormatter={() => ""}
              stroke="rgb(var(--accent-rgb))"
              fill="rgb(var(--surface-rgb) / 0.4)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

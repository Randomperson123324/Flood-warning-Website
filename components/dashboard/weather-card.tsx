"use client"

import { useMemo } from "react"
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CloudRain, Droplet, Wind } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import type { WeatherData } from "@/types"

interface WeatherCardProps {
  weather: WeatherData | null
  loading: boolean
}

export function WeatherCard({ weather, loading }: WeatherCardProps) {
  const { t, locale } = useLanguage()

  const chartData = useMemo(
    () =>
      (weather?.hourly ?? []).map((hour) => ({
        time: new Date(hour.time).getTime(),
        temp: hour.temp,
        precipitation: hour.precipitation,
      })),
    [weather?.hourly],
  )

  const hourFormatter = (value: number) =>
    new Date(value).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit" })

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink-soft">{t("weather", "title")}</p>
        {weather && <p className="text-xs text-ink-soft">{weather.source}</p>}
      </div>

      {loading && !weather ? (
        <div className="glass-shimmer h-32 animate-shimmer rounded-glass-sm" />
      ) : !weather ? (
        <p className="text-sm text-ink-soft">{t("common", "error")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-4xl font-semibold tabular-nums">{weather.current.temp ?? "–"}°</span>
            <div>
              <p className="font-medium">{locale === "th" ? weather.current.descriptionTh : weather.current.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
                <span className="flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5" /> {t("weather", "humidity")} {weather.current.humidity ?? "–"}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" /> {t("weather", "wind")} {weather.current.windSpeed ?? "–"} km/h
                </span>
                <span className="flex items-center gap-1">
                  <CloudRain className="h-3.5 w-3.5" /> {t("weather", "rainLastHour")} {weather.current.rain["1h"]} mm
                </span>
              </div>
            </div>
          </div>

          {chartData.length > 1 && (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="hourlyTempFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.08} vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={hourFormatter}
                  tick={{ fontSize: 10, fill: "rgb(var(--ink-soft-rgb))" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  yAxisId="temp"
                  tick={{ fontSize: 10, fill: "rgb(var(--ink-soft-rgb))" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  unit="°"
                />
                <YAxis yAxisId="rain" orientation="right" hide domain={[0, "auto"]} />
                <Tooltip
                  labelFormatter={(value) => hourFormatter(Number(value))}
                  formatter={(value: number, name: string) =>
                    name === "temp" ? [`${value.toFixed(0)}°`, t("weather", "title")] : [`${value.toFixed(1)} mm`, t("weather", "rainLastHour")]
                  }
                  contentStyle={{
                    background: "rgb(var(--surface-strong-rgb) / 0.9)",
                    border: "1px solid rgb(var(--border-rgb) / 0.15)",
                    borderRadius: 12,
                    backdropFilter: "blur(12px)",
                  }}
                />
                <Bar yAxisId="rain" dataKey="precipitation" fill="rgb(var(--accent-soft-rgb) / 0.35)" radius={[3, 3, 0, 0]} barSize={6} />
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temp"
                  stroke="rgb(var(--accent-rgb))"
                  strokeWidth={2}
                  fill="url(#hourlyTempFill)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

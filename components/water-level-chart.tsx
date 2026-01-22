"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { useLanguage } from "../hooks/language-context"

interface WaterLevelChartProps {
  data: Array<{
    timestamp: string
    level: number
    temperature?: number
  }>
  warningLevel?: number
  dangerLevel?: number
}

export function WaterLevelChart({ data, warningLevel = 50, dangerLevel = 100 }: WaterLevelChartProps) {
  const { t } = useLanguage()

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={formatXAxis} interval="preserveStartEnd" />
          <YAxis
            domain={[0, 200]}
            label={{ value: t.chart.yAxisLabel, angle: -90, position: "insideLeft" }}
            fontFamily="var(--font-sao-chingcha)" // Apply SaoChingcha font to YAxis numbers
          />
          <Tooltip
            labelFormatter={(value) =>
              new Date(value).toLocaleString("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hourCycle: "h23",
              })
            }
            formatter={(value: number) => [`${value} cm`, t.chart.waterLevel]}
            contentStyle={{ fontFamily: "var(--font-sao-chingcha)" }} // Apply SaoChingcha font to Tooltip content
          />
          <ReferenceLine y={dangerLevel} stroke="red" strokeDasharray="5 5" label={t.chart.dangerLevel} />
          <ReferenceLine y={warningLevel} stroke="orange" strokeDasharray="5 5" label={t.chart.warningLevel} />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

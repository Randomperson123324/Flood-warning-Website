"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "../hooks/language-context"

interface EnhancedWaterLevelChartProps {
  data: Array<{
    timestamp: string
    level: number
    temperature?: number
    source?: "website" | "community" | "combined"
  }>
  warningLevel?: number
  dangerLevel?: number
  defaultRange?: "1h" | "6h" | "12h" | "24h" | "all"
}

export function EnhancedWaterLevelChart({
  data,
  warningLevel = 20,
  dangerLevel = 40,
  defaultRange = "24h",
  dateRangeLabel,
}: EnhancedWaterLevelChartProps & { dateRangeLabel?: string }) {
  const { t } = useLanguage()
  const [selectedRange, setSelectedRange] = useState(defaultRange)

  const getFilteredData = () => {
    if (selectedRange === "all") return data

    const now = new Date().getTime()
    let filterMs = 0

    switch (selectedRange) {
      case "1h":
        filterMs = 60 * 60 * 1000
        break
      case "6h":
        filterMs = 6 * 60 * 60 * 1000
        break
      case "12h":
        filterMs = 12 * 60 * 60 * 1000
        break
      case "24h":
        filterMs = 24 * 60 * 60 * 1000
        break
      default:
        return data
    }

    return data.filter((reading) => {
      const readingTime = new Date(reading.timestamp).getTime()
      return readingTime >= now - filterMs
    })
  }

  const filteredData = getFilteredData()

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    // If range is <= 24h, show time. Otherwise show date
    if (selectedRange !== "all") {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getLineColor = (dataPoint: any) => {
    if (!dataPoint.source) return "#2563eb"
    switch (dataPoint.source) {
      case "website":
        return "#2563eb" // Blue
      case "community":
        return "#10b981" // Green
      case "combined":
        return "#8b5cf6" // Purple
      default:
        return "#2563eb"
    }
  }

  return (
    <div className="space-y-4">
      {/* Chart controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {dateRangeLabel || (selectedRange === "all" ? t.chart.lastWeek : `${selectedRange}`)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {filteredData.length} readings
          </Badge>
        </div>

        <Tabs
          value={selectedRange}
          onValueChange={(value) => setSelectedRange(value as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-5 h-8">
            <TabsTrigger value="1h" className="text-[10px] px-2">1h</TabsTrigger>
            <TabsTrigger value="6h" className="text-[10px] px-2">6h</TabsTrigger>
            <TabsTrigger value="12h" className="text-[10px] px-2">12h</TabsTrigger>
            <TabsTrigger value="24h" className="text-[10px] px-2">24h</TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] px-2">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              interval="preserveStartEnd"
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              interval="preserveStartEnd"
              domain={["auto", "auto"]}
            />
            <YAxis
              domain={[0, 200]}
              label={{ value: t.chart.yAxisLabel, angle: -90, position: "insideLeft" }}
              fontFamily="var(--font-sao-chingcha)"
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
              formatter={(value: number, name: string, props: any) => {
                const sourceLabel = props.payload.source
                  ? ` (${t.cards[props.payload.source as keyof typeof t.cards] || props.payload.source})`
                  : ""
                return [`${value} cm${sourceLabel}`, t.chart.waterLevel]
              }}
              contentStyle={{ fontFamily: "var(--font-sao-chingcha)" }}
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

      {/* Data source legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>{t.cards.website}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          <span>{t.cards.community}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
          <span>{t.cards.combined}</span>
        </div>
      </div>
    </div>
  )
}

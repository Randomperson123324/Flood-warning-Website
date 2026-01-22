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
  Brush,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ZoomIn, ZoomOut, RotateCcw, RefreshCw } from "lucide-react"
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
  onRefresh?: () => void
  isRefreshing?: boolean
  showLast24Hours?: boolean
}

export function EnhancedWaterLevelChart({
  data,
  warningLevel = 20,
  dangerLevel = 40,
  onRefresh,
  isRefreshing = false,
  showLast24Hours = false,
}: EnhancedWaterLevelChartProps) {
  const { t } = useLanguage()
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null)

  // Filter data for last 24 hours if requested
  const filteredData = showLast24Hours
    ? data.filter((reading) => {
      const readingTime = new Date(reading.timestamp).getTime()
      const now = Date.now()
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
      return readingTime >= twentyFourHoursAgo
    })
    : data

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    return showLast24Hours
      ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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

  const handleZoomIn = () => {
    if (filteredData.length > 0) {
      const dataLength = filteredData.length
      const start = Math.floor(dataLength * 0.25)
      const end = Math.floor(dataLength * 0.75)
      setZoomDomain([start, end])
    }
  }

  const handleZoomOut = () => {
    setZoomDomain(null)
  }

  const resetZoom = () => {
    setZoomDomain(null)
  }

  return (
    <div className="space-y-4">
      {/* Chart controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {showLast24Hours ? t.chart.last24Hours : t.chart.lastWeek}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {filteredData.length} readings
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={!filteredData.length}
            title={t.cards.zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={!zoomDomain} title={t.cards.zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={resetZoom} disabled={!zoomDomain} title={t.cards.resetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>

          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} title={t.cards.refreshData}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
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
              domain={zoomDomain || ["dataMin", "dataMax"]}
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
            {showLast24Hours && <Brush dataKey="timestamp" height={30} stroke="#2563eb" tickFormatter={formatXAxis} />}
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

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

import { cn } from "@/lib/utils"

// ... (props interface update)

interface EnhancedWaterLevelChartProps {
  data?: Array<{
    timestamp: string
    level: number
    temperature?: number
    source?: "website" | "community" | "combined"
  }>
  multiData?: { [key: string]: any[] } // For comparison: { "DateLabel": data[] }
  warningLevel?: number
  dangerLevel?: number
  onRefresh?: () => void
  isRefreshing?: boolean
  showLast24Hours?: boolean
  className?: string
}

export function EnhancedWaterLevelChart({
  data,
  multiData,
  warningLevel = 5,
  dangerLevel = 10,
  onRefresh,
  isRefreshing = false,
  showLast24Hours = false,
  dateRangeLabel,
  className,
}: EnhancedWaterLevelChartProps & { dateRangeLabel?: string }) {
  // ... (existing state and logic)
  const { t } = useLanguage()
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null)

  // Use either single data or transform multiData
  const isComparison = !!multiData && Object.keys(multiData).length > 0

  const filteredData = isComparison
    ? [] // We'll handle multiData differently
    : (showLast24Hours
      ? (data || []).filter((reading) => {
        const readingTime = new Date(reading.timestamp).getTime()
        const now = Date.now()
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
        return readingTime >= twentyFourHoursAgo
      })
      : (data || []))

  // ... (rest of logic up to return)

  const normalizedMultiData = isComparison ? Object.entries(multiData!).map(([label, readings]) => {
    return {
      label,
      data: readings.map(r => ({
        ...r,
        // Create a fake date with same year/month/day to align them on X axis
        normalizedTime: new Date(r.timestamp).getHours() * 60 + new Date(r.timestamp).getMinutes()
      }))
    }
  }) : []

  const formatXAxis = (tickItem: any) => {
    if (isComparison) {
      const hours = Math.floor(tickItem / 60)
      const minutes = tickItem % 60
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    const date = new Date(tickItem)
    return showLast24Hours
      ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const handleZoomIn = () => {
    if (!isComparison && filteredData.length > 0) {
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

  const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"]

  return (
    <div className="space-y-4">
      {/* Chart controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isComparison && (
            <>
              <Badge variant="outline" className="text-xs">
                {dateRangeLabel || (showLast24Hours ? t.chart.last24Hours : t.chart.lastWeek)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {filteredData.length} readings
              </Badge>
            </>
          )}
          {isComparison && (
            <Badge variant="outline" className="text-xs">
              {t.chart.compareData}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={isComparison || !filteredData.length}
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
      <div className={cn("h-[400px] w-full", className)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={isComparison ? "normalizedTime" : "timestamp"}
              type={isComparison ? "number" : "category"}
              domain={isComparison ? [0, 1440] : (zoomDomain || ["dataMin", "dataMax"])}
              tickFormatter={formatXAxis}
              interval={isComparison ? 120 : "preserveStartEnd"}
            />
            <YAxis
              domain={[0, (dataMax: number) => Math.max(20, Math.ceil(dataMax / 10) * 10)]}
              label={{ value: t.chart.yAxisLabel, angle: -90, position: "insideLeft" }}
              fontFamily="var(--font-sao-chingcha)"
            />
            <Tooltip
              labelFormatter={(value) => {
                if (isComparison) {
                  const hours = Math.floor(value / 60)
                  const minutes = value % 60
                  return `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                }
                return new Date(value).toLocaleString("en-US", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hourCycle: "h23",
                })
              }}
              formatter={(value: number, name: string, props: any) => {
                const sourceLabel = props.payload.source
                  ? ` (${t.cards[props.payload.source as keyof typeof t.cards] || props.payload.source})`
                  : ""
                return [`${value} cm${sourceLabel}`, name || t.chart.waterLevel]
              }}
              contentStyle={{ fontFamily: "var(--font-sao-chingcha)" }}
            />
            <ReferenceLine y={dangerLevel} stroke="red" strokeDasharray="5 5" label={t.chart.dangerLevel} />
            <ReferenceLine y={warningLevel} stroke="orange" strokeDasharray="5 5" label={t.chart.warningLevel} />

            {isComparison ? (
              normalizedMultiData.map((series, idx) => (
                <Line
                  key={series.label}
                  data={series.data}
                  type="monotone"
                  dataKey="level"
                  name={new Date(series.label).toLocaleDateString()}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))
            ) : (
              <Line
                data={filteredData}
                type="monotone"
                dataKey="level"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}
            {!isComparison && showLast24Hours && <Brush dataKey="timestamp" height={30} stroke="#2563eb" tickFormatter={formatXAxis} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data source legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>{t.cards.website}</span>
        </div>
      </div>
    </div>
  )
}

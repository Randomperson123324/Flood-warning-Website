"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { useLanguage } from "../hooks/language-context"

interface WeeklyTrendChartProps {
  data: Array<{
    timestamp: string
    level: number
    temperature?: number
  }>
  warningLevel?: number
  dangerLevel?: number
}

export function WeeklyTrendChart({ data, warningLevel = 5, dangerLevel = 10 }: WeeklyTrendChartProps) {
  const { t } = useLanguage()

  // Process data to show daily averages for the past week
  const processWeeklyData = () => {
    console.log("🔍 Weekly Chart Debug - Raw data:", data?.length || 0, "readings")

    if (!data || data.length === 0) {
      console.log("❌ Weekly Chart: No data available")
      return { chartData: [], debugInfo: "No data available" }
    }

    // Show sample of timestamps for debugging
    const sampleTimestamps = data.slice(0, 3).map((r) => r.timestamp)
    console.log("📅 Sample timestamps:", sampleTimestamps)

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log("📅 Weekly Chart: Date range", weekAgo.toISOString(), "to", now.toISOString())

    // Filter data from the past week
    const weekData = data.filter((reading) => {
      const readingDate = new Date(reading.timestamp)
      const isInRange = readingDate >= weekAgo
      return isInRange
    })

    console.log("📊 Weekly Chart: Filtered data:", weekData.length, "readings in past week")

    // If no data in past week, try past 30 days as fallback
    let fallbackData = []
    if (weekData.length === 0) {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      fallbackData = data.filter((reading) => {
        const readingDate = new Date(reading.timestamp)
        return readingDate >= monthAgo
      })
      console.log("📊 Weekly Chart: Fallback to 30 days:", fallbackData.length, "readings")
    }

    const dataToUse = weekData.length > 0 ? weekData : fallbackData
    const timeRange = weekData.length > 0 ? "7 days" : "30 days"

    if (dataToUse.length === 0) {
      console.log("❌ Weekly Chart: No data even in past 30 days")
      return {
        chartData: [],
        debugInfo: `No data in past 30 days. Latest: ${data[data.length - 1]?.timestamp || "none"}`,
      }
    }

    // Group by day and calculate daily averages
    const dailyData: { [key: string]: number[] } = {}

    dataToUse.forEach((reading) => {
      const date = new Date(reading.timestamp)
      const dayKey = date.toISOString().split("T")[0] // YYYY-MM-DD format

      if (!dailyData[dayKey]) {
        dailyData[dayKey] = []
      }
      dailyData[dayKey].push(reading.level)
    })

    console.log("📈 Weekly Chart: Daily groups:", Object.keys(dailyData))

    // Calculate averages and format for chart
    const chartData = Object.entries(dailyData)
      .map(([date, levels]) => {
        const average = levels.reduce((sum, level) => sum + level, 0) / levels.length
        console.log(`📊 ${date}: ${levels.length} readings, avg: ${average.toFixed(1)}cm`)
        return {
          timestamp: date,
          level: Math.round(average * 10) / 10, // Round to 1 decimal place
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        }
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    console.log("✅ Weekly Chart: Final chart data:", chartData)
    return {
      chartData,
      debugInfo: `Showing ${chartData.length} days from past ${timeRange}`,
    }
  }

  const { chartData: weeklyData, debugInfo } = processWeeklyData()

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  // Show message if no data
  if (weeklyData.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No Weekly Data Available</div>
          <div className="text-sm mb-2">{debugInfo}</div>
          <div className="text-xs mt-2 p-3 bg-gray-50 rounded text-left">
            <div className="font-medium mb-1">Debug Info:</div>
            <div>• Total readings: {data?.length || 0}</div>
            <div>• Latest reading: {data?.[data.length - 1]?.timestamp || "None"}</div>
            <div>• Oldest reading: {data?.[0]?.timestamp || "None"}</div>
          </div>
          <div className="text-xs mt-2 text-blue-600">
            💡 Tip: Run the "insert-recent-sample-data.sql" script to add fresh test data
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full">
      <div className="text-xs text-gray-500 mb-2">{debugInfo}</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={formatXAxis} interval="preserveStartEnd" />
          <YAxis
            domain={[0, 200]}
            label={{ value: t.chart.yAxisLabel, angle: -90, position: "insideLeft" }}
            fontFamily="var(--font-sao-chingcha)" // Apply SaoChingcha font to YAxis numbers
          />
          <Tooltip
            labelFormatter={(value) =>
              new Date(value).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            }
            formatter={(value: number) => [`${value} cm`, "Daily Average"]}
            contentStyle={{ fontFamily: "var(--font-sao-chingcha)" }} // Apply SaoChingcha font to Tooltip content
          />
          <ReferenceLine y={dangerLevel} stroke="red" strokeDasharray="5 5" label={t.chart.dangerLevel} />
          <ReferenceLine y={warningLevel} stroke="orange" strokeDasharray="5 5" label={t.chart.warningLevel} />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: "#10b981", strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { useLanguage } from "./language-context"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Add error handling for missing environment variables
let supabase: any = null
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error)
}

interface WaterReading {
  id: number
  timestamp: string
  level: number
  temperature?: number
  sensor_id: string
}

interface WaterAnalytics {
  dailyAverage: number
  peakLevel: number
}

interface TimeToWarningData {
  days: number | null
  hours: number | null
  minutes: number | null
  isStable: boolean
}

export function useWaterData() {
  const { t } = useLanguage()
  const [waterData, setWaterData] = useState<WaterReading[]>([])
  const [currentLevel, setCurrentLevel] = useState(0)
  const [regressionRate, setRegressionRate] = useState(0)
  const [trend, setTrend] = useState<"rising" | "falling" | "stable">("stable")
  const [timeToWarningData, setTimeToWarningData] = useState<TimeToWarningData>({
    days: null,
    hours: null,
    minutes: null,
    isStable: true,
  })
  const [analytics, setAnalytics] = useState<WaterAnalytics>({ dailyAverage: 0, peakLevel: 0 })
  const [historicalAnalytics, setHistoricalAnalytics] = useState<WaterAnalytics>({ dailyAverage: 0, peakLevel: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [tableExists, setTableExists] = useState(true)
  const [historicalData, setHistoricalData] = useState<WaterReading[]>([])
  const [isFetchingHistorical, setIsFetchingHistorical] = useState(false)

  const getWarningLevels = () => {
    if (typeof window === "undefined") {
      return { warningLevel: 20, dangerLevel: 40, updateInterval: 30 }
    }

    try {
      const saved = localStorage.getItem("waterLevelSettings")
      if (saved) {
        const settings = JSON.parse(saved)
        return {
          warningLevel: Number.parseFloat(settings.warningLevel) || 20,
          dangerLevel: Number.parseFloat(settings.dangerLevel) || 40,
          updateInterval: Number.parseInt(settings.updateInterval) || 30,
        }
      }
    } catch (error) {
      console.error("Error reading localStorage:", error)
    }

    return { warningLevel: 20, dangerLevel: 40, updateInterval: 30 }
  }

  const calculateAnalytics = (data: WaterReading[]): WaterAnalytics => {
    if (data.length === 0) {
      return { dailyAverage: 0, peakLevel: 0 }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // For historical data that might span multiple days or a specific past day,
    // we generally want to calculate stats for the entire dataset provided.
    // But for the "live" view, we explicitly want "Today's" stats.
    // The previous logic filtered for 'today'.
    // Let's keep the logic flexible: if the data is "live" (contains today), filter for today.
    // If it's historical (explicitly fetched range), use all of it.
    // However, to keep it simple and reusable: let's assume the caller filters the data
    // OR we check if the dataset looks like a "feed" vs a "range".

    // Actually, looking at the previous implementation, it filtered `data` (which was limit 100)
    // for readings >= today.

    // Let's split this.
    // 1. Live data analytics (Today)
    // 2. Historical data analytics (Selected Range)

    // We will just expose a simple calculator that processes ALL given data.
    // For live data, we will filter it before passing it in.

    const dailyAverage = data.reduce((sum, reading) => sum + reading.level, 0) / data.length
    const peakLevel = Math.max(...data.map((reading) => reading.level))

    return {
      dailyAverage: Math.round(dailyAverage * 10) / 10,
      peakLevel: Math.round(peakLevel * 10) / 10,
    }
  }

  const fetchWaterData = async () => {
    if (!supabase || !tableExists) {
      setIsConnected(false)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("water_readings")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100)

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.log("ℹ️ Water readings table not found - feature disabled")
          setTableExists(false)
          setIsConnected(false)
          setIsLoading(false)
          return
        }
        console.error("Error fetching water data:", error)
        setIsConnected(false)
        setIsLoading(false)
        return
      }

      setIsConnected(true)
      setLastUpdateTime(new Date())

      if (data && data.length > 0) {
        setWaterData(data)
        setCurrentLevel(data[0].level)

        // Calculate analytics from real data
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayData = data.filter((reading) => {
          const readingDate = new Date(reading.timestamp)
          return readingDate >= today
        })

        if (todayData.length > 0) {
          setAnalytics(calculateAnalytics(todayData))
        } else {
          // Fallback to all data if no data for today? 
          // Original code fell back to calculating on ALL data if todayData was empty.
          setAnalytics(calculateAnalytics(data))
        }

        calculateTrendAndWarning(data)
      }
    } catch (error) {
      console.log("ℹ️ Water data unavailable:", error)
      setTableExists(false)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTrendAndWarning = (data: WaterReading[]) => {
    if (data.length < 5) {
      setTrend("stable")
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      return
    }

    const { warningLevel } = getWarningLevels()

    const recentReadings = data.slice(0, 10).reverse()

    if (recentReadings.length < 2) {
      setTrend("stable")
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      return
    }

    // For 5-minute sensor updates, a window of 12 readings covers exactly 1 hour.
    // This provides a balance between stability and responsiveness to flash floods.
    const maxWindow = 12
    const rawReadings = data.slice(0, maxWindow).reverse()

    if (rawReadings.length < 5) {
      setTrend("stable")
      setRegressionRate(0)
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      return
    }

    // 1. Noise Filtering: Remove outliers (sensor spikes)
    // We use a simple filter: remove points that are significantly different from their neighbors
    const filteredReadings = rawReadings.filter((reading, i, arr) => {
      if (i === 0 || i === arr.length - 1) return true
      const prev = arr[i - 1].level
      const next = arr[i + 1].level
      const avgNeighbor = (prev + next) / 2
      // If the point is more than 5cm away from the average of its neighbors, it's likely noise
      return Math.abs(reading.level - avgNeighbor) < 5
    })

    const n = filteredReadings.length
    if (n < 5) {
      setTrend("stable")
      setRegressionRate(0)
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      return
    }

    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    const firstTimestamp = new Date(filteredReadings[0].timestamp).getTime()

    filteredReadings.forEach((reading) => {
      const x = (new Date(reading.timestamp).getTime() - firstTimestamp) / (1000 * 60) // minutes
      const y = reading.level
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    })

    const denominator = n * sumX2 - sumX * sumX
    const ratePerMinute = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
    const ratePerHour = ratePerMinute * 60
    setRegressionRate(ratePerHour)

    if (Math.abs(ratePerHour) < 0.05) {
      setTrend("stable")
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
    } else if (ratePerHour > 0) {
      setTrend("rising")

      const currentLevel = data[0].level
      const { warningLevel, dangerLevel } = getWarningLevels()

      // 2. Context-Aware Target: Warning if below, Danger if above warning
      let targetLevel = warningLevel
      if (currentLevel >= warningLevel && currentLevel < dangerLevel) {
        targetLevel = dangerLevel
      } else if (currentLevel >= dangerLevel) {
        // Already at critical level
        setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
        return
      }

      const minutesToTarget = (targetLevel - currentLevel) / ratePerMinute

      if (minutesToTarget > 0) {
        const totalMinutes = Math.floor(minutesToTarget)
        const days = Math.floor(totalMinutes / 1440)
        const hours = Math.floor((totalMinutes % 1440) / 60)
        const minutes = totalMinutes % 60

        setTimeToWarningData({
          days: days > 0 ? days : null,
          hours: hours > 0 || days > 0 ? hours : null,
          minutes: minutes > 0 || (days === 0 && hours === 0) ? minutes : null,
          isStable: false,
        })
      } else {
        setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      }
    } else {
      setTrend("falling")
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
    }
  }

  const getCurrentRate = () => {
    return { ratePerHour: Math.round(regressionRate * 100) / 100, timestamp: lastUpdateTime }
  }

  const getLatestReadingTime = () => {
    if (waterData.length === 0) return null
    return new Date(waterData[0].timestamp)
  }

  const testConnection = async () => {
    if (!supabase || !tableExists) {
      setIsConnected(false)
      return false
    }

    try {
      const { error } = await supabase.from("water_readings").select("id").limit(1)

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          setTableExists(false)
          setIsConnected(false)
          return false
        }
      }

      const connected = !error
      setIsConnected(connected)
      return connected
    } catch (error) {
      console.log("ℹ️ Connection test skipped - table not available")
      setTableExists(false)
      setIsConnected(false)
      return false
    }
  }

  const fetchHistoricalData = async (startDate: Date, endDate: Date) => {
    if (!supabase || !tableExists) return

    try {
      setIsFetchingHistorical(true)
      // Ensure end date covers the full day
      const adjustedEnd = new Date(endDate)
      adjustedEnd.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("water_readings")
        .select("*")
        .gte("timestamp", startDate.toISOString())
        .lte("timestamp", adjustedEnd.toISOString())
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching historical data:", error)
        return
      }

      setHistoricalData(data || [])
      setHistoricalAnalytics(calculateAnalytics(data || []))
    } catch (error) {
      console.error("Error fetching historical data:", error)
    } finally {
      setIsFetchingHistorical(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    testConnection()
    fetchWaterData()

    let subscription: any = null
    if (supabase && tableExists) {
      subscription = supabase
        .channel("water_readings")
        .on("postgres_changes", { event: "*", schema: "public", table: "water_readings" }, (payload: any) => {
          console.log("New water reading:", payload.new)
          fetchWaterData()
        })
        .subscribe()
    }

    const interval = setInterval(fetchWaterData, 999999999999999999999) //temporary fix
    const connectionTest = setInterval(testConnection, 120000)


    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "waterLevelSettings") {
        fetchWaterData()
      }
    }
    window.addEventListener("storage", handleStorageChange)

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      clearInterval(interval)
      clearInterval(connectionTest)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [tableExists])

  return {
    waterData,
    currentLevel,
    trend,
    timeToWarningData,
    analytics,
    isLoading,
    isConnected,
    lastUpdateTime,
    testConnection,
    getCurrentRate,
    getLatestReadingTime,
    historicalData,
    isFetchingHistorical,
    fetchHistoricalData,
    historicalAnalytics,
  }
}

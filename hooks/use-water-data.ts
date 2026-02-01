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
        .limit(300)

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.log("\u2139\ufe0f Water readings table not found - feature disabled")
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
          setAnalytics(calculateAnalytics(data))
        }

        calculateTrendAndWarning(data)
      }
    } catch (error) {
      console.log("\u2139\ufe0f Water data unavailable:", error)
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

    const maxWindow = 12
    const rawReadings = data.slice(0, maxWindow).reverse()

    if (rawReadings.length < 5) {
      setTrend("stable")
      setRegressionRate(0)
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      return
    }

    const filteredReadings = rawReadings.filter((reading, i, arr) => {
      if (i === 0 || i === arr.length - 1) return true
      const prev = arr[i - 1].level
      const next = arr[i + 1].level
      const avgNeighbor = (prev + next) / 2
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

      let targetLevel = warningLevel
      if (currentLevel >= warningLevel && currentLevel < dangerLevel) {
        targetLevel = dangerLevel
      } else if (currentLevel >= dangerLevel) {
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
      console.log("\u2139\ufe0f Connection test skipped - table not available")
      setTableExists(false)
      setIsConnected(false)
      return false
    }
  }

  const fetchHistoricalData = async (startDate: Date, endDate: Date) => {
    if (!supabase || !tableExists) return

    try {
      setIsFetchingHistorical(true)
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

  const fetchMultiDateData = async (dates: Date[]) => {
    if (!supabase || !tableExists || dates.length === 0) return

    try {
      setIsFetchingHistorical(true)

      // We fetch all data in one go for the selected days
      // Or we can fetch individually. Let's fetch individually to be precise about the days.
      const allResults: { [key: string]: WaterReading[] } = {}

      for (const date of dates) {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
          .from("water_readings")
          .select("*")
          .gte("timestamp", start.toISOString())
          .lte("timestamp", end.toISOString())
          .order("timestamp", { ascending: true })
          .limit(1000)

        if (error) {
          console.error(`Error fetching data for ${date.toDateString()}:`, error)
          continue
        }

        allResults[date.toISOString()] = data || []
      }

      return allResults
    } catch (error) {
      console.error("Error fetching multi-date data:", error)
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
    fetchMultiDateData,
  }
}

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
  const [trend, setTrend] = useState<"rising" | "falling" | "stable">("stable")
  const [timeToWarningData, setTimeToWarningData] = useState<TimeToWarningData>({
    days: null,
    hours: null,
    minutes: null,
    isStable: true,
  })
  const [analytics, setAnalytics] = useState<WaterAnalytics>({ dailyAverage: 0, peakLevel: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [tableExists, setTableExists] = useState(true)

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
          const dailyAverage = todayData.reduce((sum, reading) => sum + reading.level, 0) / todayData.length
          const peakLevel = Math.max(...todayData.map((reading) => reading.level))

          setAnalytics({
            dailyAverage: Math.round(dailyAverage * 10) / 10,
            peakLevel: Math.round(peakLevel * 10) / 10,
          })
        } else {
          const allLevels = data.map((reading) => reading.level)
          const dailyAverage = allLevels.reduce((sum, level) => sum + level, 0) / allLevels.length
          const peakLevel = Math.max(...allLevels)

          setAnalytics({
            dailyAverage: Math.round(dailyAverage * 10) / 10,
            peakLevel: Math.round(peakLevel * 10) / 10,
          })
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

    // Use linear regression for more precise trend and ETA calculation
    const n = Math.min(recentReadings.length, 20)
    const regressionData = recentReadings.slice(-n)

    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    const firstTimestamp = new Date(regressionData[0].timestamp).getTime()

    regressionData.forEach((reading) => {
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

    if (Math.abs(ratePerHour) < 0.05) {
      setTrend("stable")
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
    } else if (ratePerHour > 0) {
      setTrend("rising")

      const currentLevel = data[0].level
      if (currentLevel < warningLevel) {
        const minutesToWarning = (warningLevel - currentLevel) / ratePerMinute

        if (minutesToWarning > 0) {
          const totalMinutes = Math.floor(minutesToWarning)
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
        setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
      }
    } else {
      setTrend("falling")
      setTimeToWarningData({ days: null, hours: null, minutes: null, isStable: true })
    }
  }

  const getCurrentRate = () => {
    if (waterData.length < 2) {
      return { ratePerHour: 0, timestamp: null }
    }

    const recentReadings = waterData.slice(0, 10).reverse()
    const oldestReading = recentReadings[0]
    const newestReading = recentReadings[recentReadings.length - 1]

    const oldestTime = new Date(oldestReading.timestamp).getTime()
    const newestTime = new Date(newestReading.timestamp).getTime()
    const timeDiffMinutes = (newestTime - oldestTime) / (1000 * 60)

    if (timeDiffMinutes <= 0) {
      return { ratePerHour: 0, timestamp: new Date() }
    }

    const levelDiff = newestReading.level - oldestReading.level
    const ratePerMinute = levelDiff / timeDiffMinutes
    const ratePerHour = ratePerMinute * 60

    return { ratePerHour: Math.round(ratePerHour * 100) / 100, timestamp: new Date() }
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

  useEffect(() => {
    if (typeof window === "undefined") return

    testConnection()
    fetchWaterData()

    let subscription: any = null
    if (supabase && tableExists) {
      subscription = supabase
        .channel("water_readings")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "water_readings" }, (payload: any) => {
          console.log("New water reading:", payload.new)
          fetchWaterData()
        })
        .subscribe()
    }

    const interval = setInterval(fetchWaterData, 10000)
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
  }
}

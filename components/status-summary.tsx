"use client"

import { useLanguage } from "../hooks/language-context"
import { useWeatherData } from "../hooks/use-weather-data"
import { Droplets, Cloud, CloudRain } from "lucide-react"
import { useState, useEffect } from "react"

interface StatusSummaryProps {
  currentLevel: number
  warningLevel: number
  dangerLevel: number
}

export function StatusSummary({ currentLevel, warningLevel, dangerLevel }: StatusSummaryProps) {
  const { t } = useLanguage()
  const { weatherData } = useWeatherData()
  const [showSplash, setShowSplash] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, 3300)

    const switchTimer = setTimeout(() => {
      setShowSplash(false)
    }, 4000)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(switchTimer)
    }
  }, [])

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return "morning"
    if (hour >= 12 && hour < 17) return "afternoon"
    if (hour >= 17 && hour < 21) return "evening"
    return "night"
  }

  const getTimeBasedGradient = () => {
    const timeOfDay = getTimeOfDay()
    switch (timeOfDay) {
      case "morning":
        return "bg-gradient-to-r from-orange-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent"
      case "afternoon":
        return "bg-gradient-to-r from-sky-500 via-blue-500 to-blue-600 bg-clip-text text-transparent"
      case "evening":
        return "bg-gradient-to-r from-orange-500 via-red-500 to-blue-600 bg-clip-text text-transparent"
      case "night":
        return "bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
      default:
        return "bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent"
    }
  }

  const getGreeting = () => {
    const timeOfDay = getTimeOfDay()
    switch (timeOfDay) {
      case "morning":
        return t.status.goodMorning
      case "afternoon":
        return t.status.goodAfternoon
      case "evening":
        return t.status.goodEvening
      case "night":
        return t.status.goodNight
      default:
        return t.status.goodMorning
    }
  }

  const getWaterStatusText = () => {
    if (currentLevel >= dangerLevel) {
      return t.status.danger
    } else if (currentLevel >= warningLevel) {
      return t.status.warning
    } else {
      return t.status.normal
    }
  }

  const getWaterStatusColor = () => {
    if (currentLevel >= dangerLevel) {
      return "text-red-600"
    } else if (currentLevel >= warningLevel) {
      return "text-orange-500"
    } else {
      return "text-blue-500"
    }
  }

  const getStatusText = () => {
    let statusText = getGreeting()

    statusText += ` ${t.status.waterLevel || "Water level is"} ${getWaterStatusText().toLowerCase()}`

    if (weatherData?.current) {
      statusText += ` ${t.status.weatherGood} ${weatherData.current.temp}°C`

      // Check if it's raining based on weather description
      const isRaining =
        weatherData.current.description.toLowerCase().includes("rain") ||
        weatherData.current.description.toLowerCase().includes("drizzle") ||
        weatherData.current.description.toLowerCase().includes("shower")

      statusText += isRaining ? ` ${t.status.raining}` : ` ${t.status.notRaining}`
    }

    return statusText
  }

  const getWeatherIcon = () => {
    if (!weatherData?.current) return null

    const isRaining =
      weatherData.current.description.toLowerCase().includes("rain") ||
      weatherData.current.description.toLowerCase().includes("drizzle") ||
      weatherData.current.description.toLowerCase().includes("shower")

    return isRaining ? <CloudRain className="w-5 h-5 text-blue-500" /> : <Cloud className="w-5 h-5 text-gray-500" />
  }

  if (showSplash) {
    return (
      <div
        className={`mb-6 flex flex-col items-center justify-center p-6 bg-white/40 dark:bg-gray-800/40 rounded-2xl backdrop-blur-md border border-white/20 shadow-sm transition-all duration-700 ${isFadingOut ? "opacity-0 scale-95" : "opacity-100 scale-100 animate-in fade-in duration-700"
          }`}
      >
        <div className="flex items-center gap-8 mb-4">
          <img
            src="/images/streelogo.png"
            alt="Stree Logo"
            className="w-14 h-14 object-contain drop-shadow-sm filter dark:brightness-110"
          />
          <img
            src="/images/floodlogo.png"
            alt="Flood Logo"
            className="w-14 h-14 object-contain drop-shadow-sm filter dark:brightness-110"
          />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            {t.status.createdBy}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between">
        <div className={`text-2xl font-semibold ${getTimeBasedGradient()}`}>{getStatusText()}</div>
        <div className="flex items-center gap-2 ml-4">
          <Droplets className={`w-6 h-6 ${getWaterStatusColor()}`} />
          {getWeatherIcon()}
        </div>
      </div>
    </div>
  )
}

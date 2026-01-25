"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { useLanguage } from "../hooks/language-context"

interface HourlyForecastProps {
  data: Array<{
    time: string
    temp: number
    description: string
    descriptionTh?: string // Thai description
    icon: string
    precipitation: number
    humidity: number
    windSpeed: number
  }>
  isLoading?: boolean
}

export function HourlyForecast({ data, isLoading }: HourlyForecastProps) {
  const { t, language } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  // Debug log to trace data flow
  console.log("HourlyForecast: Received data length:", data?.length, "isLoading:", isLoading)

  const displayData = isExpanded ? data : (data ? data.slice(0, 5) : [])

  const getWeatherIcon = (iconCode: string) => {
    const code = iconCode?.toLowerCase() || ""

    if (code.includes("rain") || code.includes("09") || code.includes("10")) {
      return <CloudRain className="h-6 w-6 text-blue-500" />
    }
    if (code.includes("snow") || code.includes("13")) {
      return <CloudSnow className="h-6 w-6 text-blue-300" />
    }
    if (code.includes("cloud") || code.includes("04") || code.includes("02")) {
      return <Cloud className="h-6 w-6 text-gray-500" />
    }
    if (code.includes("clear") || code.includes("01") || code.includes("sunny")) {
      return <Sun className="h-6 w-6 text-yellow-500" />
    }
    if (code.includes("thunder") || code.includes("11")) {
      return <CloudRain className="h-6 w-6 text-purple-600" />
    }
    return <Sun className="h-6 w-6 text-yellow-500" /> // Default icon
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.weather.hourlyForecast}
            <Badge variant="outline" className="ml-2">
              Hourly
            </Badge>
          </CardTitle>
          <CardDescription>{t.common.loading}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.weather.hourlyForecast}</CardTitle>
          <CardDescription>No hourly forecast data available from API</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t.weather.hourlyForecast}
          <Badge variant="outline" className="ml-2">
            Hourly
          </Badge>
        </CardTitle>
        <CardDescription>Detailed weather conditions for the next few hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayData.map((hour, index) => (
            <div
              key={index}
              className="p-4 border rounded-tr-lg rounded-bl-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">
                  {new Date(hour.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })}
                </div>
                {getWeatherIcon(hour.icon)}
              </div>

              <div className="text-2xl font-bold font-inter-numbers mb-1">{hour.temp}°C</div>

              <div className="text-sm text-muted-foreground capitalize mb-3">
                {language === "th" && hour.descriptionTh ? hour.descriptionTh : hour.description}
              </div>

              <div className="space-y-2">
                {hour.precipitation > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    <span className="font-inter-numbers">{hour.precipitation}mm</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs">
                  <Droplets className="h-3 w-3 text-gray-400" />
                  <span className="font-inter-numbers">{hour.humidity}%</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Wind className="h-3 w-3 text-gray-400" />
                  <span className="font-inter-numbers">{hour.windSpeed} m/s</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.length > 5 && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full sm:w-auto"
            >
              {isExpanded ? t.weather.showLess : t.weather.showMore}
              {isExpanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets } from "lucide-react"
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
}

export function HourlyForecast({ data }: HourlyForecastProps) {
  const { t, language } = useLanguage()

  const getWeatherIcon = (iconCode: string) => {
    const code = iconCode.toLowerCase()

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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.weather.hourlyForecast}</CardTitle>
          <CardDescription>No hourly forecast data available</CardDescription>
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
            3-Hour
          </Badge>
        </CardTitle>
        <CardDescription>Detailed weather conditions for the next few hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((hour, index) => (
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
                  <span className="font-inter-numbers">
                    {hour.windSpeed !== undefined ? `${hour.windSpeed} m/s` : "-- m/s"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

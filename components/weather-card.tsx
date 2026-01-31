"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, AlertTriangle, RefreshCw, MapPin, Eye } from "lucide-react"
import { useLanguage } from "../hooks/language-context"

interface WeatherData {
  city: string
  country: string
  coordinates: { lat: number; lon: number }
  current: {
    temp: number
    humidity: number
    rain?: {
      "1h"?: number
      "3h"?: number
      "24h"?: number
    }
    description: string
    descriptionTh?: string // Thai description
    icon: string
  }
  forecast: Array<{
    date: string
    tempMax: number
    tempMin: number
    description: string
    descriptionTh?: string // Thai description
    icon: string
    precipitation: number
  }>
  hourly: Array<{
    time: string
    temp: number
    description: string
    descriptionTh?: string // Thai description
    icon: string
    precipitation: number
    humidity: number
    windSpeed: number
  }>
  source: string // Added to indicate data source (e.g., "Live Data")
  timestamp: string // Added to indicate when data was fetched
}

interface WeatherCardProps {
  data: WeatherData | null
  isLoading: boolean
  error?: string | null
  onRetry?: () => void
  showCurrent?: boolean // Control whether to show current weather section
  showForecast?: boolean // Control whether to show forecast section
}

export function WeatherCard({ data, isLoading, error, onRetry, showCurrent = true, showForecast = true }: WeatherCardProps) {
  const { t, language } = useLanguage()

  const getWeatherIcon = (iconCode: string) => {
    const code = iconCode.toLowerCase()

    if (code.includes("rain") || code.includes("09") || code.includes("10")) {
      return <CloudRain className="h-8 w-8 text-blue-500" />
    }
    if (code.includes("cloud") || code.includes("04") || code.includes("02")) {
      return <Cloud className="h-8 w-8 text-gray-500" />
    }
    if (code.includes("clear") || code.includes("01") || code.includes("sunny")) {
      return <Sun className="h-8 w-8 text-yellow-500" />
    }
    if (code.includes("thunder") || code.includes("11")) {
      return <CloudRain className="h-8 w-8 text-purple-600" />
    }
    return <Sun className="h-8 w-8 text-yellow-500" /> // Default icon
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.weather.title}
            <Badge variant="outline" className="ml-2">
              Loading...
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.weather.title}
            <Badge variant="destructive" className="ml-2">
              Error
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Weather service unavailable</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
                  <strong>Troubleshooting Steps:</strong>
                  <br />
                  1. Ensure `TMD_API_TOKEN` is set in your `.env.local` (for local) or Vercel Environment
                  Variables (for deployment).
                  <br />
                  2. Verify your API token is correct and valid. Regenerate if needed at
                  https://data.tmd.go.th/nwpapi/login.
                  <br />
                  3. Check `LATITUDE`, `LONGITUDE`, and `CITY_NAME` in your environment variables.
                </div>
                {onRetry && (
                  <Button onClick={onRetry} size="sm" variant="outline" className="mt-2 bg-transparent">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.weather.title}
            <Badge variant="secondary" className="ml-2">
              No Data
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t.weather.noData}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Weather */}
      {showCurrent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getWeatherIcon(data.current.icon)}
              {t.weather.current}
              <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                <Eye className="h-3 w-3 mr-1" />
                {data.source}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">
                {data.city}
                {data.country && `, ${data.country}`}
              </span>
              <Badge variant="outline" className="ml-2 text-xs font-inter-numbers">
                {data.coordinates.lat.toFixed(2)}, {data.coordinates.lon.toFixed(2)}
              </Badge>
            </CardDescription>
            <CardDescription className="capitalize font-medium text-base">
              {language === "th" && data.current.descriptionTh ? data.current.descriptionTh : data.current.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-tr-lg rounded-bl-2xl">
                <Thermometer className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold font-inter-numbers">
                    {data.current.temp !== undefined ? `${data.current.temp}°C` : "--°C"}
                  </div>
                  <div className="text-sm text-muted-foreground">Temperature</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-tr-lg rounded-bl-2xl">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold font-inter-numbers">
                    {data.current.humidity !== undefined ? `${data.current.humidity}%` : "--%"}
                  </div>
                  <div className="text-sm text-muted-foreground">Humidity</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-tr-lg rounded-bl-2xl">
                <Wind className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-2xl font-bold font-inter-numbers">
                    {data.current.windSpeed !== undefined ? `${data.current.windSpeed} m/s` : "-- m/s"}
                  </div>
                  <div className="text-sm text-muted-foreground">Wind Speed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-tr-lg rounded-bl-2xl">
                <CloudRain className="h-5 w-5 text-indigo-500" />
                <div>
                  <div className="text-2xl font-bold font-inter-numbers">
                    {data.current.rain?.["24h"] !== undefined ? `${data.current.rain?.["24h"]} mm` : "-- mm"}
                  </div>
                  <div className="text-sm text-muted-foreground">Rain (24h)</div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground text-center font-inter-numbers">
              Last updated: {new Date(data.timestamp).toLocaleString()} • Data from {data.source}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast */}
      {showForecast && data.forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t.weather.forecast}
              <Badge variant="outline" className="ml-2">
                5-Day
              </Badge>
            </CardTitle>
            <CardDescription>{t.weather.forecastDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {data.forecast.map((day, index) => (
                <div
                  key={index}
                  className="text-center p-4 border rounded-tr-lg rounded-bl-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium mb-2">
                    {new Date(day.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="flex justify-center mb-2">{getWeatherIcon(day.icon)}</div>
                  <div className="text-lg font-bold font-inter-numbers flex flex-col items-center">
                    <span className="text-red-500 text-sm">H: {day.tempMax}°C</span>
                    <span className="text-blue-500 text-sm">L: {day.tempMin}°C</span>
                  </div>
                  <div className="text-sm text-muted-foreground capitalize mt-2">
                    {language === "th" && day.descriptionTh ? day.descriptionTh : day.description}
                  </div>
                  {day.precipitation > 0 && (
                    <div className="text-xs text-blue-600 mt-1 font-medium font-inter-numbers">
                      {day.precipitation}mm rain
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

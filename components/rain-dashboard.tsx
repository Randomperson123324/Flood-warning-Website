"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CloudRain, CloudDrizzle, Sun, AlertTriangle } from "lucide-react"
import { useLanguage } from "../hooks/language-context"

interface RainDashboardProps {
  weatherData: {
    current: {
      rain?: {
        "1h"?: number
        "3h"?: number
      }
      snow?: {
        "1h"?: number
        "3h"?: number
      }
      description: string
      icon: string
    }
  } | null
  isLoading: boolean
}

export function RainDashboard({ weatherData, isLoading }: RainDashboardProps) {
  const { t } = useLanguage()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5" />
            {t.precipitation?.title || "Precipitation"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded-tr-lg rounded-bl-2xl w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded-tr-lg rounded-bl-2xl w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5" />
            {t.precipitation?.title || "Precipitation"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.precipitation?.noData || "No data available"}</p>
        </CardContent>
      </Card>
    )
  }

  const { current } = weatherData
  const rainAmount1h = current.rain?.["1h"] || 0
  const rainAmount3h = current.rain?.["3h"] || 0
  const snowAmount1h = current.snow?.["1h"] || 0
  const snowAmount3h = current.snow?.["3h"] || 0

  const isRaining = rainAmount1h > 0 || rainAmount3h > 0
  const isSnowing = snowAmount1h > 0 || snowAmount3h > 0
  const isPrecipitating = isRaining || isSnowing

  const getRainIntensity = (amount: number) => {
    // Add fallback translations in case they're missing
    const intensityLabels = {
      none: t.precipitation?.intensity?.none || "No Rain",
      light: t.precipitation?.intensity?.light || "Light Rain",
      moderate: t.precipitation?.intensity?.moderate || "Moderate Rain",
      heavy: t.precipitation?.intensity?.heavy || "Heavy Rain",
      extreme: t.precipitation?.intensity?.extreme || "Extreme Rain",
    }

    if (amount === 0) return { level: "none", color: "default", text: intensityLabels.none }
    if (amount < 0.5) return { level: "light", color: "secondary", text: intensityLabels.light }
    if (amount < 2.5) return { level: "moderate", color: "default", text: intensityLabels.moderate }
    if (amount < 10) return { level: "heavy", color: "destructive", text: intensityLabels.heavy }
    return { level: "extreme", color: "destructive", text: intensityLabels.extreme }
  }

  const getIcon = () => {
    if (isSnowing) return <CloudRain className="h-8 w-8 text-blue-400" />
    if (rainAmount1h > 2.5) return <CloudRain className="h-8 w-8 text-blue-600" />
    if (rainAmount1h > 0.5) return <CloudDrizzle className="h-8 w-8 text-blue-500" />
    if (rainAmount1h > 0) return <CloudDrizzle className="h-8 w-8 text-blue-400" />
    return <Sun className="h-8 w-8 text-yellow-500" />
  }

  const intensity = getRainIntensity(rainAmount1h)

  return (
    <div className="space-y-6">
      {/* Main Rain Status Card */}
      <Card className={isPrecipitating ? "border-blue-200 bg-blue-50/50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getIcon()}
            {t.precipitation?.status || "Precipitation Status"}
            <Badge variant={intensity.color as any} className="ml-2">
              {isPrecipitating ? t.precipitation?.active || "Active" : t.precipitation?.dry || "Dry"}
            </Badge>
          </CardTitle>
          <CardDescription className="capitalize font-medium text-base">{current.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Current Rain Status */}
            <div className="space-y-4">
              <div className="text-center p-6 rounded-tr-lg rounded-bl-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="text-4xl font-bold font-inter-numbers text-blue-700 mb-2">
                  {isRaining ? `${rainAmount1h.toFixed(1)} mm` : "0 mm"}
                </div>
                <div className="text-lg font-semibold text-blue-600 mb-1">{intensity.text}</div>
                <div className="text-sm text-blue-500">{t.precipitation?.lastHour || "Last Hour"}</div>
              </div>

              {rainAmount3h > 0 && (
                <div className="text-center p-4 rounded-tr-lg rounded-bl-lg bg-blue-50 border border-blue-100">
                  <div className="text-2xl font-bold font-inter-numbers text-blue-600 mb-1">
                    {rainAmount3h.toFixed(1)} mm
                  </div>
                  <div className="text-sm text-blue-500">{t.precipitation?.lastThreeHours || "Last Three Hours"}</div>
                </div>
              )}
            </div>

            {/* Flood Risk Assessment */}
            <div className="space-y-4">
              <div className="p-4 rounded-tr-lg rounded-bl-lg border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t.precipitation?.floodRisk?.title || "Flood Risk"}
                </h4>
                <div className="space-y-2">
                  {rainAmount1h === 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">{t.precipitation?.floodRisk?.none || "None"}</span>
                    </div>
                  )}
                  {rainAmount1h > 0 && rainAmount1h < 2.5 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">{t.precipitation?.floodRisk?.low || "Low"}</span>
                    </div>
                  )}
                  {rainAmount1h >= 2.5 && rainAmount1h < 10 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm">{t.precipitation?.floodRisk?.moderate || "Moderate"}</span>
                    </div>
                  )}
                  {rainAmount1h >= 10 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">{t.precipitation?.floodRisk?.high || "High"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Snow Information */}
              {isSnowing && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-700">{t.precipitation?.snow?.title || "Snow"}</h4>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium font-inter-numbers">{snowAmount1h.toFixed(1)} mm</span>{" "}
                      {t.precipitation?.snow?.lastHour || "Last Hour"}
                    </div>
                    {snowAmount3h > 0 && (
                      <div className="text-sm">
                        <span className="font-medium font-inter-numbers">{snowAmount3h.toFixed(1)} mm</span>{" "}
                        {t.precipitation?.snow?.lastThreeHours || "Last Three Hours"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-6 p-4 bg-gray-50 rounded-tr-lg rounded-bl-lg">
            <h4 className="font-semibold mb-2">{t.precipitation?.guidelines?.title || "Guidelines"}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
              <div>
                <div className="font-medium text-green-600">{t.precipitation?.guidelines?.light || "Light"}</div>
                <div className="text-gray-600">
                  {t.precipitation?.guidelines?.lightDesc || "Light rain does not pose a significant risk."}
                </div>
              </div>
              <div>
                <div className="font-medium text-yellow-600">{t.precipitation?.guidelines?.moderate || "Moderate"}</div>
                <div className="text-gray-600">
                  {t.precipitation?.guidelines?.moderateDesc ||
                    "Moderate rain may cause some flooding in low-lying areas."}
                </div>
              </div>
              <div>
                <div className="font-medium text-orange-600">{t.precipitation?.guidelines?.heavy || "Heavy"}</div>
                <div className="text-gray-600">
                  {t.precipitation?.guidelines?.heavyDesc || "Heavy rain can lead to flooding and may require caution."}
                </div>
              </div>
              <div>
                <div className="font-medium text-red-600">{t.precipitation?.guidelines?.extreme || "Extreme"}</div>
                <div className="text-gray-600">
                  {t.precipitation?.guidelines?.extremeDesc ||
                    "Extreme rain poses a high risk of flooding and should be taken seriously."}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

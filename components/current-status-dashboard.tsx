"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Droplets, WifiOff, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"

interface CurrentStatusDashboardProps {
  currentLevel: number
  warningLevel: number
  dangerLevel: number
  trend: "rising" | "falling" | "stable"
  timeToWarningData: {
    days: number | null
    hours: number | null
    minutes: number | null
    isStable: boolean
  }
  isConnected: boolean
  latestReadingTime: Date | null
  currentRate: number
  currentRateTimestamp: Date | null
}

export function CurrentStatusDashboard({
  currentLevel,
  warningLevel,
  dangerLevel,
  trend,
  timeToWarningData,
  isConnected,
  latestReadingTime,
  currentRate,
  currentRateTimestamp,
}: CurrentStatusDashboardProps) {
  const { t, language } = useLanguage()

  const getStatusColor = (level: number) => {
    if (level >= dangerLevel) return "destructive"
    if (level >= warningLevel) return "secondary"
    return "default"
  }

  const getStatusText = (level: number) => {
    if (level >= dangerLevel) return t.status.danger
    if (level >= warningLevel) return t.status.warning
    return t.status.normal
  }

  const getCardBackgroundColor = (level: number) => {
    if (level >= dangerLevel) return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    if (level >= warningLevel) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "rising":
        return <TrendingUp className="h-4 w-4 text-red-600" />
      case "falling":
        return <TrendingDown className="h-4 w-4 text-green-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case "rising":
        return "text-red-600"
      case "falling":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  // Function to format time to warning
  const formatTimeToWarning = () => {
    if (timeToWarningData.isStable) {
      return t.cards.stable
    }

    const parts: React.JSX.Element[] = []
    if (timeToWarningData.days !== null && timeToWarningData.days > 0) {
      parts.push(
        <span key="days">
          <span className="font-inter-numbers">{timeToWarningData.days}</span> {t.timeUnits.days}
        </span>,
      )
    }
    if (timeToWarningData.hours !== null && (timeToWarningData.hours > 0 || parts.length > 0)) {
      parts.push(
        <span key="hours">
          <span className="font-inter-numbers">{timeToWarningData.hours}</span> {t.timeUnits.hours}
        </span>,
      )
    }
    if (timeToWarningData.minutes !== null && (timeToWarningData.minutes > 0 || parts.length === 0)) {
      parts.push(
        <span key="minutes">
          <span className="font-inter-numbers">{timeToWarningData.minutes}</span> {t.timeUnits.minutes}
        </span>,
      )
    }

    return parts.length > 0 ? (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && " "}
          </React.Fragment>
        ))}
      </>
    ) : (
      t.cards.stable
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <Card className={getCardBackgroundColor(currentLevel)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t.cards.currentLevel}</CardTitle>
          <Droplets className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-inter-numbers mb-2">{currentLevel} cm</div>
          <Badge variant={getStatusColor(currentLevel)} className="mb-2">
            {getStatusText(currentLevel)}
          </Badge>
          {latestReadingTime && (
            <div className="text-xs text-muted-foreground mt-1 font-inter-numbers">
              {latestReadingTime.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hourCycle: "h23",
              })}
            </div>
          )}
        </CardContent>
        {!isConnected && (
          <div className="w-full py-2 bg-red-600 rounded-b-xl flex items-center justify-center gap-2 text-white">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">{t.system.disconnected}</span>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t.cards.trend}</CardTitle>
          {getTrendIcon()}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold capitalize ${getTrendColor()}`}>{t.trends[trend]}</div>
          <p className="text-xs text-muted-foreground mt-2">{t.cards.trendDescription}</p>
          <div className="text-sm font-inter-numbers text-muted-foreground">
            Rate: {currentRate} {t.trends.ratePerHour}
            {currentRateTimestamp && (
              <div className="text-xs mt-1">
                {currentRateTimestamp.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card
        className={
          currentLevel >= dangerLevel ? "bg-red-600 border-red-700 text-white" : undefined
        }
      >
        <CardHeader>
          <CardTitle className={`text-sm font-medium ${currentLevel >= dangerLevel ? "text-white" : ""}`}>
            {currentLevel >= dangerLevel
              ? t.cards.criticalReached
              : currentLevel >= warningLevel
                ? t.cards.timeToDanger
                : t.cards.timeToWarning}
          </CardTitle>
          <AlertTriangle className={`h-4 w-4 ${currentLevel >= dangerLevel ? "text-white" : "text-yellow-600"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${currentLevel >= dangerLevel ? "text-white" : ""}`}>
            {currentLevel >= dangerLevel ? t.status.danger : formatTimeToWarning()}
          </div>
          <p
            className={`text-xs mt-2 ${currentLevel >= dangerLevel ? "text-red-100" : "text-muted-foreground"}`}
          >
            {t.cards.timeToWarningDescription}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

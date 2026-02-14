"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Droplets, WifiOff, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"
import { cn } from "@/lib/utils"

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
  className?: string
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
  className,
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

  // New function for shadow/glow effect
  // New function for shadow/glow effect
  const getTextGlow = (level: number) => {
    if (level >= dangerLevel) return "drop-shadow-[0_0_25px_rgba(239,68,68,1)]"
    if (level >= warningLevel) return "drop-shadow-[0_0_25px_rgba(234,179,8,1)]"
    return "drop-shadow-[0_0_25px_rgba(34,197,94,1)]"
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
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6", className)}>
      <Card className={cn(
        "col-span-1 sm:col-span-2 lg:col-span-2 relative overflow-hidden transition-all duration-500 flex flex-col justify-between min-h-[250px]",
        "bg-white dark:bg-gray-900" // White/Dark background
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t.cards.currentLevel}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal text-xs py-0.5 h-6">
              {t.cards.trend}: {t.trends[trend]}
            </Badge>
            <div className="flex items-center justify-center p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <Droplets className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
            {/* Left Side: Water Level */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className={cn(
                "text-6xl sm:text-7xl font-bold font-inter-numbers mb-2 tracking-tight transition-all duration-500",
                getTextGlow(currentLevel)
              )}>
                {currentLevel} <span className="text-2xl sm:text-3xl font-normal text-muted-foreground">cm</span>
              </div>
              <Badge variant={getStatusColor(currentLevel)} className="mb-2 text-sm px-3 py-0.5">
                {getStatusText(currentLevel)}
              </Badge>
              {latestReadingTime && (
                <div className="text-xs text-muted-foreground font-inter-numbers">
                  {latestReadingTime.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hourCycle: "h23",
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-full h-px sm:w-px sm:h-28 bg-border transition-all duration-300" />

            {/* Right Side: Trend & Stats */}
            <div className="flex flex-col items-center justify-center flex-1 space-y-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1.5">
                  {getTrendIcon()}
                  <span className={`text-xl font-bold capitalize ${getTrendColor()}`}>{t.trends[trend]}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[180px] leading-tight">{t.cards.trendDescription}</p>
              </div>

              <div className="flex flex-col items-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg w-full max-w-[180px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Rate</span>
                <div className="text-lg font-bold font-inter-numbers">
                  {currentRate} {t.trends.ratePerHour}
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {!isConnected && (
          <div className="absolute bottom-0 left-0 w-full py-1 bg-red-600 flex items-center justify-center gap-2 text-white">
            <WifiOff className="h-3 w-3" />
            <span className="text-xs font-medium">{t.system.disconnected}</span>
          </div>
        )}
      </Card>

      {/* Replaced Trend Card with Time to Warning Card (shifted up) */}

      <Card
        className={cn(
          "col-span-1 sm:col-span-2 lg:col-span-2 min-h-[250px] flex flex-col justify-between relative overflow-hidden",
          currentLevel >= dangerLevel ? "bg-red-600 border-red-700 text-white" : undefined
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className={`text-sm font-medium uppercase tracking-wider ${currentLevel >= dangerLevel ? "text-white" : "text-muted-foreground"}`}>
            {currentLevel >= dangerLevel
              ? t.cards.criticalReached
              : currentLevel >= warningLevel
                ? t.cards.timeToDanger
                : t.cards.timeToWarning}
          </CardTitle>
          <AlertTriangle className={`h-4 w-4 ${currentLevel >= dangerLevel ? "text-white" : "text-yellow-600"}`} />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 flex-1 space-y-6">
          <div className={`text-5xl sm:text-6xl font-bold font-inter-numbers text-center ${currentLevel >= dangerLevel ? "text-white" : ""}`}>
            {currentLevel >= dangerLevel ? t.status.danger : formatTimeToWarning()}
          </div>
          <p
            className={`text-sm text-center max-w-[220px] leading-relaxed ${currentLevel >= dangerLevel ? "text-red-100" : "text-muted-foreground"}`}
          >
            {t.cards.timeToWarningDescription}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"


import React, { useState, useEffect, useMemo } from "react"
import { DatePickerWithRange } from "../components/date-range-picker"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertTriangle,
  Droplets,
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
  QrCode,
  WifiOff,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { EnhancedWaterLevelChart } from "../components/enhanced-water-level-chart"
import { WeatherCard } from "../components/weather-card"
import { WeatherMap } from "../components/weather-map"
import { HourlyForecast } from "../components/hourly-forecast"
import { RainDashboard } from "../components/rain-dashboard"
import { CommunityChat } from "../components/community-chat"
import { FloodReport } from "../components/flood-report"
import { AffectedAreas } from "../components/affected-areas"
import { DeveloperSettings } from "../components/developer-settings"
import { SystemStatus } from "../components/system-status"
import { AnnouncementBanner } from "../components/announcement-banner"
import { WeatherVoteResults } from "../components/weather-vote-results"
import { StatusSummary } from "../components/status-summary"
import { StickyHeader } from "../components/sticky-header"
import { useLanguage } from "@/hooks/language-context"
import { LanguageToggle } from "../components/language-toggle"
import { useWaterData } from "@/hooks/use-water-data"
import { useWeatherData } from "@/hooks/use-weather-data"
import { Footer } from "../components/footer"
import { LoadingOverlay } from "../components/loading-overlay"
import { CurrentStatusDashboard } from "../components/current-status-dashboard"
import { WarningScreen } from "../components/warning-screen"
import { Sidebar } from "../components/sidebar"
import { cn } from "@/lib/utils"
import type { JSX } from "react/jsx-runtime"

export default function Dashboard() {
  const { t, language } = useLanguage()
  const {
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
    getLatestReadingTime, // Get the latest reading timestamp function
    historicalData,
    fetchHistoricalData,
    isFetchingHistorical,
    historicalAnalytics,
    fetchMultiDateData,
    fetchSampledData,
    fetchWaterData,
  } = useWaterData()
  const { weatherData, isLoading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeatherData()
  const [showDeveloperSettings, setShowDeveloperSettings] = useState(false)
  const [warningLevels, setWarningLevels] = useState({ warningLevel: 5, dangerLevel: 10 })
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dataComparison, setDataComparison] = useState<"today" | "last7Days" | "pastData" | "compare">("today")
  const [date, setDate] = useState<Date | undefined>()
  const [compareDates, setCompareDates] = useState<Date[]>([])
  const [compareData, setCompareData] = useState<{ [key: string]: any[] }>({})
  const [sampledData, setSampledData] = useState<any[]>([])
  const [showLineQR, setShowLineQR] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const router = useRouter()

  // Effect for multi-date comparison
  useEffect(() => {
    if (dataComparison === "compare" && compareDates.length > 0) {
      const fetchData = async () => {
        const results = await fetchMultiDateData(compareDates)
        if (results) {
          setCompareData(results)
        }
      }
      fetchData()
    } else if (dataComparison === "last7Days") {
      const fetchSampled = async () => {
        const results = await fetchSampledData()
        setSampledData(results)
      }
      fetchSampled()
    }
  }, [dataComparison, compareDates])

  // Get warning levels from localStorage or use defaults
  useEffect(() => {
    setMounted(true)

    const getWarningLevels = () => {
      try {
        const saved = localStorage.getItem("waterLevelSettings")
        if (saved) {
          const settings = JSON.parse(saved)
          return {
            warningLevel: Number.parseFloat(settings.warningLevel) || 5,
            dangerLevel: Number.parseFloat(settings.dangerLevel) || 10,
          }
        }
      } catch (error) {
        console.error("Error reading localStorage:", error)
      }
      return { warningLevel: 5, dangerLevel: 10 }
    }

    setWarningLevels(getWarningLevels())

    // Check for dark mode preference
    const darkMode = localStorage.getItem("darkMode") === "true"
    setIsDarkMode(darkMode)
    if (darkMode) {
      document.documentElement.classList.add("dark")
    }

    // Listen for settings changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "waterLevelSettings") {
        setWarningLevels(getWarningLevels())
      }
    }
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Chronological data for charts (Supabase returns descending)
  const sortedWaterData = useMemo(() => {
    return [...waterData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [waterData])

  // Only today's data for the "Now" section
  const todayWaterData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sortedWaterData.filter((reading: any) => new Date(reading.timestamp) >= today)
  }, [sortedWaterData])

  // Fetch historical data when date changes
  useEffect(() => {
    if (dataComparison === "pastData" && date) {
      fetchHistoricalData(date, date)
    }
  }, [dataComparison, date])

  useEffect(() => {
    if (!isLoading && isFirstLoad) {
      const timer = setTimeout(() => {
        setIsFirstLoad(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isLoading, isFirstLoad])

  const { warningLevel, dangerLevel } = warningLevels

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem("darkMode", newDarkMode.toString())

    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }



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

    const parts: JSX.Element[] = []
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

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-pulse text-lg">{t.common.loading}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{"รอแป็ป เว็บนี้งบน้อย"}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col md:flex-row">
      <WarningScreen
        currentLevel={currentLevel}
        warningLevel={warningLevel}
        dangerLevel={dangerLevel}
        trend={trend}
        timeToWarningData={timeToWarningData}
        isConnected={isConnected}
        latestReadingTime={getLatestReadingTime()}
        currentRate={getCurrentRate().ratePerHour}
        currentRateTimestamp={getCurrentRate().timestamp}
      />

      {/* Sidebar for Desktop */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      {/* Sticky Header for Mobile */}
      <div className="md:hidden">
        <StickyHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSettingsClick={() => setShowDeveloperSettings(true)}
        />
      </div>

      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-16"
      )}>
        {/* Announcement Banner */}
        <AnnouncementBanner />

        <div className="p-4 sm:p-6 pt-8 w-full">
          {/* Status Summary */}
          <StatusSummary currentLevel={currentLevel} warningLevel={warningLevel} dangerLevel={dangerLevel} />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                {activeTab === "overview" && t.tabstitle.overview}
                {activeTab === "analytics" && t.tabstitle.analytics}
                {activeTab === "weather" && t.tabstitle.weather}
                {activeTab === "community" && t.tabstitle.community}
              </h1>

              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
                {activeTab === "overview" && t.subtitles.overview}
                {activeTab === "analytics" && t.subtitles.analytics}
                {activeTab === "weather" && t.subtitles.weather}
                {activeTab === "community" && t.subtitles.community}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <SystemStatus isConnected={isConnected} lastUpdateTime={lastUpdateTime} onTestConnection={testConnection} />
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-transparent" title={t.common.addUsOnLINE}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-tr-lg rounded-bl-lg flex items-center justify-center mb-2 mx-auto">
                      <img
                        src="/images/design-mode/M_917ybsgj_BW.png"
                        alt="Add us on LINE"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t.common.addLineContact}</p>
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                      {t.common.close}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2">
                <LanguageToggle showTooltip={true} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDeveloperSettings(true)}
                  className="bg-transparent"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <LoadingOverlay isLoading={isFirstLoad}>
            <WeatherVoteResults />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <div className="md:hidden">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">{t.tabs.overview}</TabsTrigger>
                  <TabsTrigger value="analytics">{t.tabs.analytics}</TabsTrigger>
                  <TabsTrigger value="weather">{t.tabs.weather}</TabsTrigger>
                  <TabsTrigger value="community">{t.tabs.community}</TabsTrigger>
                </TabsList>
              </div>

              {/* Stale Data Warning */}
              {(() => {
                const lastReading = getLatestReadingTime()
                if (!lastReading) return null
                const diffInMinutes = Math.floor((new Date().getTime() - lastReading.getTime()) / (1000 * 60))
                if (diffInMinutes > 7) {
                  return (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-3 text-yellow-800">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <p className="font-medium text-sm sm:text-base">
                          {t.alerts.sensorStale.replace("{minutes}", diffInMinutes.toString())}
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column (Trend & ETA) - Takes up 6 columns on desktop (50%) */}
                  <div className="col-span-1 md:col-span-12 lg:col-span-6 space-y-6">
                    <CurrentStatusDashboard
                      currentLevel={currentLevel}
                      warningLevel={warningLevel}
                      dangerLevel={dangerLevel}
                      trend={trend}
                      timeToWarningData={timeToWarningData}
                      isConnected={isConnected}
                      latestReadingTime={getLatestReadingTime()}
                      currentRate={getCurrentRate().ratePerHour}
                      currentRateTimestamp={getCurrentRate().timestamp}
                      className="grid-cols-1 md:grid-cols-2" // Responsive grid inside left column
                    />

                  </div>

                  {/* Right Column (Graph) - Takes up 6 columns on desktop (50%) */}
                  <div className="col-span-1 md:col-span-12 lg:col-span-6">
                    {/* Enhanced Water Level Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.chart.title}</CardTitle>
                        <CardDescription>{t.chart.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <EnhancedWaterLevelChart
                          data={todayWaterData}
                          warningLevel={warningLevel}
                          dangerLevel={dangerLevel}
                          className="h-[350px]"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Affected Areas - Full Width at Bottom */}
                <div className="mt-6">
                  <AffectedAreas />
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                {/* Data Comparison Controls */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={dataComparison === "today" ? "default" : "outline"}
                        onClick={() => setDataComparison("today")}
                      >
                        {t.analytics.today}
                      </Button>
                      <Button
                        variant={dataComparison === "last7Days" ? "default" : "outline"}
                        onClick={() => setDataComparison("last7Days")}
                      >
                        {t.analytics.last7Days}
                      </Button>
                      <Button
                        variant={dataComparison === "pastData" ? "default" : "outline"}
                        onClick={() => setDataComparison("pastData")}
                      >
                        {t.analytics.pastData}
                      </Button>
                      <Button
                        variant={dataComparison === "compare" ? "default" : "outline"}
                        onClick={() => setDataComparison("compare")}
                      >
                        {t.analytics.compare}
                      </Button>
                    </div>
                    {dataComparison === "pastData" && (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <DatePickerWithRange date={date} setDate={setDate} />
                      </div>
                    )}
                  </div>

                  {dataComparison === "compare" && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      {compareDates.map((d: Date, i: number) => (
                        <Badge key={`badge-${i}-${d.getTime()}`} variant="secondary" className="flex items-center gap-1 py-1 pr-1">
                          {d.toLocaleDateString()}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 rounded-full"
                            onClick={() => setCompareDates((prev: Date[]) => prev.filter((_, idx) => idx !== i))}
                          >
                            <span className="sr-only">Remove</span>
                            &times;
                          </Button>
                        </Badge>
                      ))}
                      {compareDates.length < 4 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">Add Date ({compareDates.length}/4)</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              onSelect={(newDate: Date | undefined) => {
                                if (newDate) {
                                  setCompareDates((prev: Date[]) => [...prev, newDate])
                                }
                              }}
                              disabled={(d: Date) => d > new Date() || compareDates.some((existing: Date) => existing.toDateString() === d.toDateString())}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}
                </div>

                {dataComparison !== "compare" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.analytics.dailyAverage}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold font-inter-numbers">
                          {dataComparison === "pastData" ? historicalAnalytics.dailyAverage : analytics.dailyAverage} cm
                        </div>
                        <p className="text-sm text-muted-foreground">{t.analytics.dailyAverageDescription}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t.analytics.peakLevel}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold font-inter-numbers">
                          {dataComparison === "pastData" ? historicalAnalytics.peakLevel : analytics.peakLevel} cm
                        </div>
                        <p className="text-sm text-muted-foreground">{t.analytics.peakLevelDescription}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {dataComparison === "compare" ? t.chart.compareData : t.analytics.weeklyTrend}
                    </CardTitle>
                    {dataComparison !== "compare" && (
                      <CardDescription>
                        {dataComparison === "today"
                          ? t.chart.last24Hours // We can keep "Last 24 Hours" label or use a new one if available
                          : dataComparison === "last7Days"
                            ? t.chart.lastWeek
                            : t.analytics.pastData}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {dataComparison === "compare" ? (
                      <EnhancedWaterLevelChart
                        multiData={compareData}
                        warningLevel={warningLevel}
                        dangerLevel={dangerLevel}
                      />
                    ) : (
                      <EnhancedWaterLevelChart
                        data={
                          dataComparison === "pastData"
                            ? historicalData
                            : dataComparison === "last7Days"
                              ? sampledData
                              : todayWaterData
                        }
                        warningLevel={warningLevel}
                        dangerLevel={dangerLevel}
                        dateRangeLabel={
                          dataComparison === "pastData"
                            ? date
                              ? date.toLocaleDateString()
                              : t.analytics.selectDateRange
                            : undefined
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="weather" className="space-y-6">
                {/* TMD Attribution Header */}
                <div className="flex items-center justify-center gap-3 pb-2">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Weather data from</span>
                  <img
                    src="/images/TMD-logo.png"
                    alt="Thai Meteorological Department"
                    className="h-12 object-contain"
                  />
                </div>

                {/* 1. Current Weather Card */}
                <WeatherCard
                  data={weatherData}
                  isLoading={weatherLoading}
                  error={weatherError}
                  onRetry={refetchWeather}
                  showCurrent={true}
                  showForecast={false}
                />

                {/* 2. Current Precipitation Status */}
                <RainDashboard weatherData={weatherData} isLoading={weatherLoading} />

                {/* 3. 3-Hour Forecast */}
                <HourlyForecast
                  data={
                    weatherData?.hourly || []
                  }

                />

                {/* 4. 5-Day Forecast */}
                <WeatherCard
                  data={weatherData}
                  isLoading={weatherLoading}
                  error={weatherError}
                  onRetry={refetchWeather}
                  showCurrent={false}
                  showForecast={true}
                />

                {/* 5. Weather Map */}
                <WeatherMap coordinates={weatherData?.coordinates} city={weatherData?.city} />
              </TabsContent>

              <TabsContent value="community" className="space-y-6">
                <FloodReport />
                <CommunityChat />
              </TabsContent>
            </Tabs>
          </LoadingOverlay>

          {/* Developer Settings Modal */}
          <DeveloperSettings open={showDeveloperSettings} onOpenChange={setShowDeveloperSettings} />

          <Footer />
        </div>
      </div>
    </div >
  )
}

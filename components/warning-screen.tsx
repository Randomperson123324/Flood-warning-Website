"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useLanguage } from "@/hooks/language-context"
import { CurrentStatusDashboard } from "./current-status-dashboard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "./ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface WarningScreenProps {
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

export function WarningScreen({
  currentLevel,
  warningLevel,
  dangerLevel,
  trend,
  timeToWarningData,
  isConnected,
  latestReadingTime,
  currentRate,
  currentRateTimestamp,
}: WarningScreenProps) {
  const { t, setLanguage, language } = useLanguage()
  const [isVisible, setIsVisible] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [canClose, setCanClose] = useState(false)

  useEffect(() => {
    // Check localStorage on mount
    const hasAcknowledged = localStorage.getItem("hasAcknowledgedWarning")
    if (!hasAcknowledged) {
      setIsVisible(true)
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden"
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("hasAcknowledgedWarning", "true")
    setIsVisible(false)
    document.body.style.overflow = "unset"
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="flex flex-col">
              <CardTitle className="text-2xl font-bold text-red-600 uppercase tracking-wider">
                {t.warningScreen.title}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {t.warningScreen.subtitle}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={language === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("en")}
            >
              EN
            </Button>
            <Button
              variant={language === "th" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("th")}
            >
              TH
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Dashboard Section */}
          <section>
            <CurrentStatusDashboard
              currentLevel={currentLevel}
              warningLevel={warningLevel}
              dangerLevel={dangerLevel}
              trend={trend}
              timeToWarningData={timeToWarningData}
              isConnected={isConnected}
              latestReadingTime={latestReadingTime}
              currentRate={currentRate}
              currentRateTimestamp={currentRateTimestamp}
            />
          </section>

          {/* Instructions Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Warning Level */}
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-6 w-6 text-yellow-600" />
                <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-500">
                  {t.warningScreen.warningLevel}
                </h3>
              </div>
              <ul className="list-decimal pl-5 space-y-3 text-yellow-900 dark:text-yellow-200/80">
                {t.warningScreen.instructions.warning.map((instruction: string, index: number) => (
                  <li key={index} className="pl-2">
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dangerous Level */}
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                <h3 className="text-xl font-bold text-red-800 dark:text-red-500">
                  {t.warningScreen.dangerLevel}
                </h3>
              </div>
              <ul className="list-decimal pl-5 space-y-3 text-red-900 dark:text-red-200/80">
                {t.warningScreen.instructions.danger.map((instruction: string, index: number) => (
                  <li key={index} className="pl-2">
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Agreement Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Checkbox
                id="agreement"
                checked={isChecked}
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  setIsChecked(checked === true)
                  setCanClose(checked === true)
                }}
                className="mt-1"
              />
              <label
                htmlFor="agreement"
                className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700 dark:text-gray-300"
              >
                {t.warningScreen.agreement}
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                onClick={handleClose}
                disabled={!canClose}
                className={`w-full sm:w-auto font-bold text-lg transition-all ${canClose
                  ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  : "opacity-50 cursor-not-allowed"
                  }`}
              >
                {t.warningScreen.continue}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Water Level Warning Banner (persistent, shows when water is unsafe) ---

interface WaterLevelWarningBannerProps {
  currentLevel: number
  warningLevel: number
  dangerLevel: number
  onHeightChange?: (height: number) => void
}

export function WaterLevelWarningBanner({
  currentLevel,
  warningLevel,
  dangerLevel,
  onHeightChange,
}: WaterLevelWarningBannerProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [dismissedTier, setDismissedTier] = useState<"warning" | "danger" | null>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const isDanger = currentLevel >= dangerLevel
  const isWarning = currentLevel >= warningLevel && currentLevel < dangerLevel
  const isUnsafe = isDanger || isWarning
  const currentTier = isDanger ? "danger" : isWarning ? "warning" : null

  // Reset dismissed state if tier changes
  useEffect(() => {
    if (currentTier && currentTier !== dismissedTier) {
      setIsDismissed(false)
      setDismissedTier(null)
    }
  }, [currentTier, dismissedTier])

  // Report height to parent for sidebar offset
  useEffect(() => {
    if (!onHeightChange) return
    if (!isUnsafe || isDismissed) {
      onHeightChange(0)
      return
    }
    const el = bannerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      onHeightChange(el.getBoundingClientRect().height)
    })
    observer.observe(el)
    onHeightChange(el.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [isUnsafe, isDismissed, isExpanded, onHeightChange])

  if (!isUnsafe || isDismissed) return null

  const instructions = isDanger
    ? t.warningScreen.instructions.danger
    : t.warningScreen.instructions.warning

  const tierLabel = isDanger
    ? t.warningScreen.dangerLevel
    : t.warningScreen.warningLevel

  const statusText = isDanger ? t.status.danger : t.status.warning

  return (
    <div
      ref={bannerRef}
      className={cn(
        "fixed top-0 left-0 z-[70] w-full shadow-lg transition-all duration-300",
        isDanger
          ? "bg-red-600 text-white"
          : "bg-amber-500 text-black"
      )}
    >
      {/* Compact bar */}
      <div className="flex items-center justify-between px-4 py-2.5 md:pl-20">
        <div className="flex items-center gap-3 min-w-0">
          {isDanger ? (
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          )}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-sm sm:text-base">{tierLabel}:</span>
            <span className="text-sm sm:text-base opacity-90">{statusText}</span>
            <span className="text-xs sm:text-sm opacity-75">
              ({currentLevel.toFixed(1)} cm)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              isDanger ? "hover:bg-white/15" : "hover:bg-black/10"
            )}
            title={isExpanded ? "Collapse" : "Show instructions"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => {
              setIsDismissed(true)
              setDismissedTier(currentTier)
            }}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              isDanger ? "hover:bg-white/15" : "hover:bg-black/10"
            )}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable instructions */}
      {isExpanded && (
        <div
          className={cn(
            "px-4 pb-3 md:pl-20 animate-in slide-in-from-top-2 duration-200",
            isDanger ? "border-t border-red-500/40" : "border-t border-amber-400/40"
          )}
        >
          <ul className="list-disc pl-5 space-y-1.5 pt-2">
            {instructions.map((instruction: string, index: number) => (
              <li key={index} className="text-sm opacity-90">
                {instruction}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

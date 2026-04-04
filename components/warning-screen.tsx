"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/hooks/language-context"
import { CurrentStatusDashboard } from "./current-status-dashboard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "./ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"

const SESSION_STORAGE_KEY = "warningDismissedTier"

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
  const [showNotification, setShowNotification] = useState(false)

  const isDanger = currentLevel >= dangerLevel
  const isWarning = currentLevel >= warningLevel && currentLevel < dangerLevel
  const isUnsafe = isDanger || isWarning
  const currentTier = isDanger ? "danger" : isWarning ? "warning" : null

  // Get dismissed tier from sessionStorage
  const getDismissedTier = useCallback((): "warning" | "danger" | null => {
    if (typeof window === "undefined") return null
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored === "warning" || stored === "danger") return stored
    return null
  }, [])

  // Set dismissed tier in sessionStorage
  const setDismissedTier = useCallback((tier: "warning" | "danger" | null) => {
    if (typeof window === "undefined") return
    if (tier) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, tier)
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

  // Water level trigger: show popup when unsafe and not already dismissed for this tier
  useEffect(() => {
    const dismissedTier = getDismissedTier()
    
    if (isUnsafe && currentTier !== dismissedTier) {
      // Not dismissed yet for this tier - show full warning
      setIsVisible(true)
      setShowNotification(false)
      setIsChecked(false)
      setCanClose(false)
      document.body.style.overflow = "hidden"
    } else if (isUnsafe && currentTier === dismissedTier) {
      // Already dismissed for this tier - show notification instead
      setIsVisible(false)
      setShowNotification(true)
      document.body.style.overflow = "unset"
    } else if (!isUnsafe) {
      // Water went back to safe — reset dismissed tier
      setDismissedTier(null)
      setIsVisible(false)
      setShowNotification(false)
      document.body.style.overflow = "unset"
    }
  }, [currentTier, isUnsafe, getDismissedTier, setDismissedTier])

  const handleClose = () => {
    if (currentTier) {
      setDismissedTier(currentTier)
    }
    setIsVisible(false)
    setShowNotification(true)
    document.body.style.overflow = "unset"
  }

  const handleDismissNotification = () => {
    setShowNotification(false)
  }

  // Show small notification banner when dismissed but still unsafe
  if (!isVisible && showNotification && isUnsafe) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-lg shadow-lg border",
          isDanger 
            ? "bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700" 
            : "bg-yellow-50 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-700"
        )}>
          <AlertTriangle className={cn(
            "h-5 w-5 flex-shrink-0",
            isDanger ? "text-red-600" : "text-yellow-600"
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-semibold",
              isDanger ? "text-red-800 dark:text-red-200" : "text-yellow-800 dark:text-yellow-200"
            )}>
              {isDanger 
                ? (language === "th" ? "ระดับน้ำอันตราย" : "Danger Level") 
                : (language === "th" ? "ระดับน้ำเตือนภัย" : "Warning Level")}
            </p>
            <p className={cn(
              "text-xs",
              isDanger ? "text-red-600 dark:text-red-300" : "text-yellow-600 dark:text-yellow-300"
            )}>
              {language === "th" 
                ? `ระดับน้ำปัจจุบัน: ${currentLevel.toFixed(2)} ซม.` 
                : `Current level: ${currentLevel.toFixed(2)} cm`}
            </p>
          </div>
          <button
            onClick={handleDismissNotification}
            className={cn(
              "p-1 rounded-full hover:bg-black/10 transition-colors",
              isDanger ? "text-red-600" : "text-yellow-600"
            )}
            aria-label={language === "th" ? "ปิด" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (!isVisible) return null

  // Determine which instructions to show
  const showWarning = isWarning
  const showDanger = isDanger

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-4xl m-auto flex-shrink-0 bg-white dark:bg-gray-900 border-none shadow-2xl relative">
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
          <div className="grid gap-6 md:grid-cols-1">
            {/* Warning Level */}
            {showWarning && (
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
            )}

            {/* Dangerous Level */}
            {showDanger && (
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
            )}
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

"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/hooks/language-context"
import { CurrentStatusDashboard } from "./current-status-dashboard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "./ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldAlert } from "lucide-react"
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
  const [dismissedTier, setDismissedTier] = useState<"warning" | "danger" | null>(null)

  const isDanger = currentLevel >= dangerLevel
  const isWarning = currentLevel >= warningLevel && currentLevel < dangerLevel
  const isUnsafe = isDanger || isWarning
  const currentTier = isDanger ? "danger" : isWarning ? "warning" : null

  // Water level trigger: show popup when unsafe and not already dismissed for this tier
  useEffect(() => {
    if (isUnsafe && currentTier !== dismissedTier) {
      setIsVisible(true)
      setIsChecked(false)
      setCanClose(false)
      document.body.style.overflow = "hidden"
    } else if (!isUnsafe) {
      // Water went back to safe — reset dismissed tier
      setDismissedTier(null)
      setIsVisible(false)
      document.body.style.overflow = "unset"
    }
  }, [currentTier, isUnsafe, dismissedTier])

  const handleClose = () => {
    if (currentTier) {
      setDismissedTier(currentTier)
    }
    setIsVisible(false)
    document.body.style.overflow = "unset"
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

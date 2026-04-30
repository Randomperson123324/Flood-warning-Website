"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"
import { cn } from "@/lib/utils"

type Tier = "safe" | "warning" | "danger"

interface NotificationEntry {
  id: number
  tier: Tier
  message: string
  timestamp: Date
}

interface WaterLevelNotificationProps {
  currentLevel: number
  warningLevel: number
  dangerLevel: number
  onExpandedChange?: (isExpanded: boolean) => void
}

export function WaterLevelNotification({
  currentLevel,
  warningLevel,
  dangerLevel,
  onExpandedChange,
}: WaterLevelNotificationProps) {
  const { language } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [highestTier, setHighestTier] = useState<Tier>("safe")
  const [prevTier, setPrevTier] = useState<Tier | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notifIdRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // Determine current tier from live data
  const currentTier: Tier =
    currentLevel >= dangerLevel
      ? "danger"
      : currentLevel >= warningLevel
        ? "warning"
        : "safe"

  // The color to display: highest tier while unsafe, safe when truly safe
  const displayTier: Tier = currentTier === "safe" ? "safe" : highestTier

  useEffect(() => {
    // Escalate highest tier (never de-escalate until safe)
    if (currentTier === "danger") {
      setHighestTier("danger")
    } else if (currentTier === "warning" && highestTier !== "danger") {
      setHighestTier("warning")
    } else if (currentTier === "safe") {
      setHighestTier("safe")
    }

    // Detect any tier change → expand + log notification
    if (prevTier !== null && prevTier !== currentTier) {
      // Clear any pending collapse
      if (timerRef.current) clearTimeout(timerRef.current)

      setIsExpanded(true)
      onExpandedChange?.(true)

      // Add to notification log
      const message = getStatusMessage(currentTier)
      notifIdRef.current += 1
      setNotifications((prev) => [
        { id: notifIdRef.current, tier: currentTier, message, timestamp: new Date() },
        ...prev,
      ].slice(0, 20)) // keep last 20

      // Collapse after 5 seconds
      timerRef.current = setTimeout(() => {
        setIsExpanded(false)
        onExpandedChange?.(false)
      }, 5000)
    }

    setPrevTier(currentTier)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTier])

  // Animated close for panel
  const closePanel = () => {
    if (!showPanel || isClosing) return
    setIsClosing(true)
    closingTimerRef.current = setTimeout(() => {
      setShowPanel(false)
      setIsClosing(false)
    }, 200)
  }

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showPanel, isClosing])

  // Cleanup closing timer
  useEffect(() => {
    return () => {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current)
    }
  }, [])

  function getStatusMessage(tier: Tier): string {
    switch (tier) {
      case "danger":
        return language === "th" ? "ระดับน้ำอันตราย!" : "Water Level: DANGER!"
      case "warning":
        return language === "th" ? "ระดับน้ำเตือนภัย" : "Water Level: WARNING"
      default:
        return language === "th" ? "ระดับน้ำกลับสู่ปกติ" : "Water Level: Safe"
    }
  }

  const getDisplayText = () => {
    switch (displayTier) {
      case "danger":
        return language === "th" ? "ระดับน้ำอันตราย!" : "Water Level: DANGER!"
      case "warning":
        return language === "th" ? "ระดับน้ำเตือนภัย" : "Water Level: WARNING"
      default:
        return language === "th" ? "ระดับน้ำปกติ" : "Water Level: Safe"
    }
  }

  // Color palette per tier
  const palette = {
    safe: {
      bg: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700",
      ring: "ring-green-300/40 dark:ring-green-500/30",
      pulse: "",
      panelBorder: "border-green-200 dark:border-green-700",
      dotBg: "bg-green-500",
    },
    warning: {
      bg: "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-500 dark:hover:bg-yellow-600",
      ring: "ring-yellow-300/40 dark:ring-yellow-500/30",
      pulse: "animate-pulse",
      panelBorder: "border-yellow-200 dark:border-yellow-700",
      dotBg: "bg-yellow-500",
    },
    danger: {
      bg: "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
      ring: "ring-red-300/40 dark:ring-red-500/30",
      pulse: "animate-pulse",
      panelBorder: "border-red-200 dark:border-red-700",
      dotBg: "bg-red-500",
    },
  }

  const color = palette[displayTier]

  const handleClick = () => {
    if (showPanel) {
      closePanel()
    } else {
      setShowPanel(true)
      setIsClosing(false)
    }
  }

  const tierDotColor = (tier: Tier) => {
    switch (tier) {
      case "danger": return "bg-red-500"
      case "warning": return "bg-yellow-500"
      default: return "bg-green-500"
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="relative w-9 h-9" ref={panelRef}>
      {/* Notification Button — positioned absolute right-0 so it expands leftward */}
      <button
        onClick={handleClick}
        className={cn(
          "absolute right-0 top-0 flex flex-row-reverse items-center justify-center rounded-md text-white ring-2 overflow-hidden cursor-pointer",
          "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          color.bg,
          color.ring,
          displayTier !== "safe" && color.pulse,
          isExpanded
            ? "h-9 px-3 gap-2"
            : "w-9 h-9"
        )}
        style={{
          width: isExpanded ? "auto" : "36px",
          maxWidth: isExpanded ? "280px" : "36px",
          transition: "max-width 500ms cubic-bezier(0.4, 0, 0.2, 1), width 500ms cubic-bezier(0.4, 0, 0.2, 1), background-color 300ms, padding 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        title={getDisplayText()}
      >
        <Bell className="h-4 w-4 shrink-0" />
        <span
          className={cn(
            "whitespace-nowrap text-sm font-semibold overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isExpanded
              ? "max-w-[220px] opacity-100"
              : "max-w-0 opacity-0"
          )}
        >
          {getDisplayText()}
        </span>
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-[60]",
            "bg-white dark:bg-gray-900",
            "transition-all duration-200 ease-out origin-top-right",
            isClosing
              ? "opacity-0 scale-95 translate-y-0"
              : "opacity-100 scale-100 translate-y-0 animate-in fade-in slide-in-from-top-2 duration-200",
            color.panelBorder
          )}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                {language === "th" ? "การแจ้งเตือน" : "Notifications"}
              </h3>
            </div>
            <button
              onClick={closePanel}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                {language === "th" ? "ยังไม่มีการแจ้งเตือน" : "No notifications yet"}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", tierDotColor(notif.tier))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatTime(notif.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Panel Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setNotifications([])}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full text-center"
              >
                {language === "th" ? "ล้างทั้งหมด" : "Clear all"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

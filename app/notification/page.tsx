"use client"

import { useState, useEffect } from "react"
import { Bell, Droplets, Megaphone, ArrowLeft, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/hooks/language-context"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: any = null
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
} catch { }

type Tab = "water-level" | "developer"

interface WaterNotification {
  id: number
  tier: "safe" | "warning" | "danger"
  message: string
  timestamp: Date
}

interface DevAnnouncement {
  id: number
  message: string
  type: string
  created_at: string
  is_active: boolean
}

export default function NotificationPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>("water-level")
  const [devAnnouncements, setDevAnnouncements] = useState<DevAnnouncement[]>([])
  const [loadingDev, setLoadingDev] = useState(true)

  // Read water-level notifications stored from the main dashboard (via localStorage)
  const [waterNotifs, setWaterNotifs] = useState<WaterNotification[]>([])

  useEffect(() => {
    // Load water notifications from localStorage if stored
    try {
      const stored = localStorage.getItem("waterLevelNotifications")
      if (stored) {
        const parsed = JSON.parse(stored)
        setWaterNotifs(
          parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
        )
      }
    } catch { }
  }, [])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoadingDev(true)
      try {
        if (!supabase) throw new Error("No supabase")
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30)
        if (error) throw error
        setDevAnnouncements(data || [])
      } catch {
        setDevAnnouncements([])
      } finally {
        setLoadingDev(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString(language === "th" ? "th-TH" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const tierIcon = (tier: "safe" | "warning" | "danger") => {
    switch (tier) {
      case "danger": return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
      default: return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
    }
  }

  const tierDot = (tier: "safe" | "warning" | "danger") => {
    switch (tier) {
      case "danger": return "bg-red-500"
      case "warning": return "bg-yellow-500"
      default: return "bg-green-500"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Icon + Title */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500 shadow-md shadow-blue-200 dark:shadow-blue-900/40">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {language === "th" ? "การแจ้งเตือน" : "Notifications"}
              </h1>
            </div>

            {/* Tab Pills — placed right after the title */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setActiveTab("water-level")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  activeTab === "water-level"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Droplets className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {language === "th" ? "ระดับน้ำ" : "Water Level"}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("developer")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  activeTab === "developer"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {language === "th" ? "ประกาศผู้พัฒนา" : "Dev Ann"}
                </span>
              </button>
            </div>
          </div>

          {/* Full Tab Labels row on mobile */}
          <div className="flex sm:hidden gap-1.5 mt-3">
            <button
              onClick={() => setActiveTab("water-level")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === "water-level"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Droplets className="h-3.5 w-3.5" />
              {language === "th" ? "ระดับน้ำ" : "Water Level"}
            </button>
            <button
              onClick={() => setActiveTab("developer")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === "developer"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Megaphone className="h-3.5 w-3.5" />
              {language === "th" ? "ประกาศผู้พัฒนา" : "Developer Ann"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Water Level Tab */}
        {activeTab === "water-level" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "th"
                  ? "การแจ้งเตือนระดับน้ำจากเซ็นเซอร์"
                  : "Live water level alerts from the sensor"}
              </p>
            </div>

            {waterNotifs.length === 0 ? (
              <EmptyState
                icon={<Droplets className="h-10 w-10 text-blue-200 dark:text-blue-900" />}
                title={language === "th" ? "ยังไม่มีการแจ้งเตือน" : "No alerts yet"}
                subtitle={language === "th"
                  ? "การแจ้งเตือนระดับน้ำจะปรากฏที่นี่"
                  : "Water level changes will appear here"}
              />
            ) : (
              <ul className="space-y-2">
                {waterNotifs.map((notif) => (
                  <li
                    key={notif.id}
                    className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", tierDot(notif.tier))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{notif.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatTime(notif.timestamp)}
                      </p>
                    </div>
                    {tierIcon(notif.tier)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Developer Announcements Tab */}
        {activeTab === "developer" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="h-4 w-4 text-purple-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "th"
                  ? "ประกาศและอัปเดตจากทีมพัฒนา"
                  : "Announcements and updates from the dev team"}
              </p>
            </div>

            {loadingDev ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : devAnnouncements.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="h-10 w-10 text-purple-200 dark:text-purple-900" />}
                title={language === "th" ? "ยังไม่มีประกาศ" : "No announcements yet"}
                subtitle={language === "th"
                  ? "ประกาศจากทีมพัฒนาจะปรากฏที่นี่"
                  : "Developer announcements will appear here"}
              />
            ) : (
              <ul className="space-y-2">
                {devAnnouncements.map((ann) => (
                  <li
                    key={ann.id}
                    className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 shrink-0">
                      <Megaphone className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                        {ann.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTime(ann.created_at)}
                        </span>
                        {ann.is_active && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {language === "th" ? "ใช้งาน" : "Active"}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-3xl">{icon}</div>
      <div>
        <p className="font-semibold text-gray-700 dark:text-gray-300">{title}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

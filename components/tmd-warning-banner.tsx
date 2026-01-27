"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"
import { cn } from "@/lib/utils"

interface WarningData {
    hasWarning: boolean
    title: string
    description: string
}

export function TMDWarningBanner() {
    const [data, setData] = useState<WarningData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const { language } = useLanguage()

    const fetchWarning = async () => {
        try {
            setIsLoading(true)
            setIsError(false)
            const response = await fetch("/api/weather/warning")
            if (response.ok) {
                const result = await response.json()
                setData(result)
            } else {
                setIsError(true)
            }
        } catch (error) {
            console.error("Failed to fetch TMD warning:", error)
            setIsError(true)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchWarning()
        // Refresh every 10 minutes
        const interval = setInterval(fetchWarning, 600000)
        return () => clearInterval(interval)
    }, [])

    if (isLoading && !data && !isError) return null

    const hasWarning = data?.hasWarning || false

    return (
        <div className="w-full">
            <Alert
                className={cn(
                    "rounded-none border-none py-2 px-4 shadow-sm transition-colors duration-500",
                    hasWarning
                        ? "bg-red-600 text-white animate-pulse"
                        : isError
                            ? "bg-yellow-500 text-black"
                            : "bg-green-600 text-white"
                )}
            >
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {hasWarning || isError ? (
                            <AlertTriangle className={cn("h-5 w-5", isError ? "text-black" : "text-red-100")} />
                        ) : (
                            <CheckCircle className="h-5 w-5 text-green-100" />
                        )}
                        <div>
                            <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                                <span>{language === "th" ? "เตือนภัยสภาพอากาศ (กรมอุตุนิยมวิทยา):" : "Weather Warning (TMD):"}</span>
                                <span className="opacity-90">
                                    {hasWarning
                                        ? (language === "th" ? "มีคำเตือนภัยสภาพอากาศ" : "ACTIVE WARNING")
                                        : isError
                                            ? (language === "th" ? "ไม่สามารถดึงข้อมูลได้" : "CAN'T FETCH DATA")
                                            : (language === "th" ? "ปกติ" : "NO WARNING")}
                                </span>
                            </div>
                            {hasWarning && data?.description && (
                                <div className="text-xs sm:text-sm line-clamp-1 opacity-90">
                                    {data.description}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchWarning()}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            title="Refresh Warning Status"
                        >
                            <RefreshCw className={cn("h-4 w-4", isError ? "text-black/80" : "text-white/80", isLoading && "animate-spin")} />
                        </button>
                        {hasWarning && (
                            <a
                                href="https://www.tmd.go.th/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline font-medium hover:text-white/80"
                            >
                                {language === "th" ? "ดูรายละเอียด" : "Details"}
                            </a>
                        )}
                    </div>
                </div>
            </Alert>
        </div>
    )
}

"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"
import { cn } from "@/lib/utils"

interface WarningData {
    hasWarning: boolean
    titleThai: string
    descriptionThai: string
    headlineThai: string
    titleEnglish: string
    descriptionEnglish: string
    headlineEnglish: string
}

export function TMDWarningBanner() {
    const [data, setData] = useState<WarningData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [showHeadline, setShowHeadline] = useState(false)
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

    if (isLoading && !data && !isError) {
        return (
            <div className="w-full">
                <Alert className="rounded-none border-none py-2 px-4 shadow-sm md:pl-16 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] relative overflow-hidden">
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                                Retrieving data from database...
                            </p>
                        </div>
                    </div>
                </Alert>
            </div>
        )
    }

    const hasWarning = data?.hasWarning || false

    return (
        <div className="w-full">
            <Alert
                className={cn(
                    "rounded-none border-none py-2 px-4 shadow-sm transition-all duration-500 md:pl-16",
                    hasWarning
                        ? "bg-red-600 text-white"
                        : isError
                            ? "bg-yellow-500 text-black"
                            : "bg-green-600 text-white"
                )}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {hasWarning || isError ? (
                            <AlertTriangle className={cn("h-5 w-5", isError ? "text-black" : "text-red-100")} />
                        ) : (
                            <CheckCircle className="h-5 w-5 text-green-100" />
                        )}
                        <div>
                            <div className="font-bold text-sm sm:text-base flex flex-wrap items-center gap-2">
                                <span>{language === "th" ? "เตือนภัยสภาพอากาศ (กรมอุตุนิยมวิทยา):" : "Weather Warning (TMD):"}</span>
                                <span className="opacity-90">
                                    {hasWarning
                                        ? (language === "th" ? data?.titleThai : data?.titleEnglish)
                                        : isError
                                            ? (language === "th" ? "ไม่สามารถดึงข้อมูลได้" : "CAN'T FETCH DATA")
                                            : (language === "th" ? "ไม่มีเตือนภัย" : "NO WARNING")}
                                </span>
                            </div>
                            {hasWarning && (
                                <div className="mt-2">
                                    <button
                                        onClick={() => setShowHeadline(!showHeadline)}
                                        className="text-xs font-bold underline hover:opacity-80 transition-opacity"
                                    >
                                        {showHeadline
                                            ? (language === "th" ? "แสดงน้อยลง" : "Show less")
                                            : (language === "th" ? "ดูเพิ่มเติม" : "See more")}
                                    </button>
                                    {showHeadline && (
                                        <div className="mt-2 space-y-3">
                                            {/* Headline/Detailed info */}
                                            {(language === "th" ? data?.headlineThai : data?.headlineEnglish) && (
                                                <div className="text-xs sm:text-sm bg-white/10 p-3 rounded border border-white/20 whitespace-pre-wrap italic">
                                                    {language === "th" ? data?.headlineThai : data?.headlineEnglish}
                                                </div>
                                            )}

                                            {/* Description */}
                                            <div className="text-xs sm:text-sm opacity-90 whitespace-pre-wrap">
                                                {language === "th" ? data?.descriptionThai : data?.descriptionEnglish}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

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

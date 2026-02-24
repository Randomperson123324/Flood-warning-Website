"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, ExternalLink, FileText } from "lucide-react"
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
    webUrlThai: string
    webUrlEnglish: string
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
                <Alert
                    className="rounded-none border-none py-2 px-4 shadow-sm transition-all duration-500 md:pl-16 bg-muted/50 dark:bg-muted/20"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full">
                            <div className="h-5 w-5 rounded-full bg-foreground/10 animate-pulse" />
                            <div className="h-4 w-48 sm:w-64 rounded bg-foreground/10 animate-pulse" />
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
                                <span>{language === "th" ? "เตือนภัยสภาพอากาศ (กรมอุตุนิยมวิทยา)" : "Weather Advisory (Thai Meteorological Department)"}</span>
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
                                    {showHeadline && (
                                        <div className="mb-3 space-y-3">
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowHeadline(!showHeadline)}
                                            className="text-xs font-semibold px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors border border-white/30"
                                        >
                                            {showHeadline
                                                ? (language === "th" ? "แสดงน้อยลง" : "Show less")
                                                : (language === "th" ? "ดูเพิ่มเติม" : "See more")}
                                        </button>
                                        {(language === "th" ? data?.webUrlThai : data?.webUrlEnglish) && (
                                            <a
                                                href={language === "th" ? data?.webUrlThai : data?.webUrlEnglish}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors border border-white/30"
                                            >
                                                <FileText className="h-3 w-3" />
                                                {language === "th" ? "ดูเอกสารประกาศ" : "See Advisory Doc"}
                                            </a>
                                        )}
                                        <a
                                            href="https://www.tmd.go.th/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors border border-white/30"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            {language === "th" ? "ไปที่กรมอุตุฯ" : "Go to TMD"}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Alert>
        </div>
    )
}

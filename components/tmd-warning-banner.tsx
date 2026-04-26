"use client"

import { useState, useEffect } from "react"
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
            <div className="w-full pl-2 pr-2 sm:pl-4 sm:pr-4 md:pl-0 pt-2 pb-2">
                <div className="inline-grid grid-cols-[auto_1fr] max-w-full rounded-full shadow-sm bg-muted/50 dark:bg-muted/20 p-1 animate-in fade-in slide-in-from-top-2 duration-500">
                    {/* Icon Area Skeleton */}
                    <div className="flex items-center justify-center bg-foreground/10 rounded-full rounded-br-none w-12 sm:w-14 aspect-square shrink-0 self-center animate-pulse">
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-foreground/10" />
                    </div>
                    {/* Text Area Skeleton */}
                    <div className="flex items-center pl-3 pr-4 sm:pr-5 py-1 sm:py-1.5 min-w-0">
                        <div className="h-4 w-48 sm:w-64 rounded bg-foreground/10 animate-pulse" />
                    </div>
                </div>
            </div>
        )
    }

    const hasWarning = data?.hasWarning || false

    // Determine colors based on state
    const iconBgColor = hasWarning
        ? "bg-red-600 text-red-50"
        : isError
            ? "bg-yellow-500 text-yellow-50"
            : "bg-green-600 text-green-50"

    const bannerBgColor = hasWarning
        ? "bg-red-100 dark:bg-red-950/40"
        : isError
            ? "bg-yellow-100 dark:bg-yellow-950/40"
            : "bg-green-100 dark:bg-green-950/40"

    const textColor = hasWarning
        ? "text-red-800 dark:text-red-200"
        : isError
            ? "text-yellow-800 dark:text-yellow-200"
            : "text-green-800 dark:text-green-200"

    const expandedContentBg = hasWarning
        ? "bg-red-200/50 dark:bg-red-900/30 border-red-300 dark:border-red-700"
        : ""

    const buttonStyle = hasWarning
        ? "bg-red-200/70 hover:bg-red-300/70 dark:bg-red-800/50 dark:hover:bg-red-700/50 text-red-900 dark:text-red-100 border-red-300 dark:border-red-600"
        : ""

    return (
        <div className="w-full pl-2 pr-2 sm:pl-4 sm:pr-4 md:pl-0 pt-2 pb-2">
            <div className={cn(
                "inline-grid grid-cols-[auto_1fr] max-w-full rounded-full shadow-sm p-1 animate-in fade-in slide-in-from-top-2 duration-500",
                bannerBgColor,
                // When expanded with warning details, use rounded corners instead of pill shape
                hasWarning && showHeadline && "rounded-2xl"
            )}>

                {/* Icon Area */}
                <div className={cn(
                    "flex items-center justify-center rounded-full rounded-br-none w-12 sm:w-14 aspect-square shrink-0 self-center",
                    iconBgColor,
                    // Adjust rounding when expanded
                    hasWarning && showHeadline && "rounded-2xl rounded-br-none rounded-tr-none"
                )}>
                    {hasWarning || isError ? (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                </div>

                {/* Text Area */}
                <div className="flex flex-col justify-center pl-3 pr-4 sm:pr-5 py-1 sm:py-1.5 min-w-0">
                    <p className={cn("font-medium text-sm sm:text-base break-words", textColor)}>
                        <span className="font-bold">{language === "th" ? "เตือนภัยสภาพอากาศ (กรมอุตุฯ)" : "Weather Advisory (TMD)"}</span>
                        {" "}
                        <span className="opacity-80">
                            {hasWarning
                                ? (language === "th" ? data?.titleThai : data?.titleEnglish)
                                : isError
                                    ? (language === "th" ? "ไม่สามารถดึงข้อมูลได้" : "CAN'T FETCH DATA")
                                    : (language === "th" ? "ไม่มีเตือนภัย" : "NO WARNING")}
                        </span>
                    </p>

                    {hasWarning && (
                        <div className="mt-2">
                            {showHeadline && (
                                <div className="mb-3 space-y-3">
                                    {/* Headline/Detailed info */}
                                    {(language === "th" ? data?.headlineThai : data?.headlineEnglish) && (
                                        <div className={cn(
                                            "text-xs sm:text-sm p-3 rounded-lg border whitespace-pre-wrap italic",
                                            expandedContentBg, textColor
                                        )}>
                                            {language === "th" ? data?.headlineThai : data?.headlineEnglish}
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div className={cn("text-xs sm:text-sm opacity-90 whitespace-pre-wrap", textColor)}>
                                        {language === "th" ? data?.descriptionThai : data?.descriptionEnglish}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setShowHeadline(!showHeadline)}
                                    className={cn(
                                        "text-xs font-semibold px-3 py-1 rounded-full transition-colors border",
                                        buttonStyle
                                    )}
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
                                        className={cn(
                                            "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors border",
                                            buttonStyle
                                        )}
                                    >
                                        <FileText className="h-3 w-3" />
                                        {language === "th" ? "ดูเอกสารประกาศ" : "See Advisory Doc"}
                                    </a>
                                )}
                                <a
                                    href="https://www.tmd.go.th/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors border",
                                        buttonStyle
                                    )}
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
    )
}

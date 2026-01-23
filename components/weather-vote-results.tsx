"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../hooks/language-context"
import { CloudRain, Info } from "lucide-react"

interface VoteStats {
    totalVotes: number
    rainVotes: number
    rainPercentage: number
    isRaining: boolean
}

export function WeatherVoteResults() {
    const { t } = useLanguage()
    const [stats, setStats] = useState<VoteStats | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [topOffset, setTopOffset] = useState(0)

    const fetchStats = async () => {
        try {
            const response = await fetch("/api/weather/vote")
            if (response.ok) {
                const data = await response.json()
                setStats(data)
                setIsVisible(data.totalVotes > 0)
            }
        } catch (error) {
            console.error("Failed to fetch vote stats", error)
        }
    }

    useEffect(() => {
        fetchStats()
        const interval = setInterval(fetchStats, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            // If sticky header is visible (scroll > 100), push this bar down
            // Sticky header height is approx 60px
            if (window.scrollY > 100) {
                setTopOffset(60)
            } else {
                setTopOffset(0)
            }
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    if (!stats || !isVisible) return null

    return (
        <div
            className="fixed left-0 right-0 z-40 flex justify-center items-center py-2 transition-all duration-300 ease-in-out bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md border-b border-blue-200 dark:border-blue-800 shadow-sm"
            style={{ top: `${topOffset}px` }}
        >
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 px-4">
                <CloudRain className="h-4 w-4" />
                <span className="font-medium whitespace-nowrap">
                    Is it raining? Community Report: {stats.rainPercentage}% Yes
                </span>
                <span className="text-xs opacity-70 hidden sm:inline-block">({stats.totalVotes} votes / 30m)</span>
            </div>
        </div>
    )
}

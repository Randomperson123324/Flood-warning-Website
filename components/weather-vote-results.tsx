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

    const fetchStats = async () => {
        try {
            const response = await fetch("/api/weather/vote")
            if (response.ok) {
                const data = await response.json()
                setStats(data)
                // Show if there are enough votes to be meaningful, e.g., > 0
                // Or always show if the user wants it at the top of all pages as per request
                // "show it at the top of all pages" - implies always visible if there's data?
                // Let's hide it if 0 votes to avoid clutter, or maybe show it to encourage voting?
                // User said: "show it at the top of all pages". Let's show it if totalVotes > 0.
                setIsVisible(data.totalVotes > 0)
            }
        } catch (error) {
            console.error("Failed to fetch vote stats", error)
        }
    }

    useEffect(() => {
        fetchStats()
        const interval = setInterval(fetchStats, 60000) // Update every minute
        return () => clearInterval(interval)
    }, [])

    if (!stats || !isVisible) return null

    return (
        <div className="bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 animate-in fade-in slide-in-from-top-2">
            <CloudRain className="h-4 w-4" />
            <span className="font-medium whitespace-nowrap">
                Is it raining? Community Report: {stats.rainPercentage}% Yes
            </span>
            <span className="text-xs opacity-70 hidden sm:inline-block">({stats.totalVotes} votes / 30m)</span>
        </div>
    )
}

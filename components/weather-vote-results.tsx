"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../hooks/language-context"
import { CloudRain, Sun, Info } from "lucide-react"

interface VoteStats {
    totalVotes: number
    totalValidVotes: number
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
                setIsVisible(data.totalValidVotes > 0)
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

    if (!stats || !isVisible) return null

    const isRainingConsensus = stats.rainPercentage >= 50
    const bgColor = isRainingConsensus ? "bg-blue-100 dark:bg-blue-900/40" : "bg-red-100 dark:bg-red-900/40"
    const borderColor = isRainingConsensus ? "border-blue-200 dark:border-blue-800" : "border-red-200 dark:border-red-800"
    const textColor = isRainingConsensus ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"
    const Icon = isRainingConsensus ? CloudRain : Sun

    return (
        <div className={`w-full py-2 mb-4 rounded-lg flex justify-start items-center px-4 border shadow-sm transition-all duration-300 ease-in-out ${bgColor} ${borderColor}`}>
            <div className={`flex items-center gap-2 text-sm ${textColor}`}>
                <Icon className="h-4 w-4" />
                <span className="font-medium whitespace-nowrap">
                    {t.weatherVote.communityReport}: {isRainingConsensus ? stats.rainPercentage : 100 - stats.rainPercentage}% {isRainingConsensus ? t.weatherVote.yes : t.weatherVote.no}
                </span>
                <span className="text-xs opacity-70 hidden sm:inline-block">({stats.totalValidVotes} {t.weatherVote.votes})</span>
            </div>
        </div>
    )
}

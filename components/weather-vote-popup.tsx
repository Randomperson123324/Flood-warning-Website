"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useWeatherData } from "@/hooks/use-weather-data"
import { useLanguage } from "@/hooks/language-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CloudRain, Sun } from "lucide-react"
import { toast } from "sonner"

export function WeatherVotePopup() {
    const { weatherData } = useWeatherData()
    const { t } = useLanguage()

    const [isOpen, setIsOpen] = useState(false)
    const [hasVoted, setHasVoted] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    )

    // Check authentication status
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setIsAuthenticated(!!session)
            setUserId(session?.user?.id || null)
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session)
            setUserId(session?.user?.id || null)
        })

        return () => subscription.unsubscribe()
    }, [])

    // Check if user has voted recently (using localStorage to avoid API spam, but API also checks)
    useEffect(() => {
        if (userId) {
            const lastVoteTime = localStorage.getItem(`weather_vote_${userId}`)
            if (lastVoteTime) {
                const timeDiff = Date.now() - parseInt(lastVoteTime)
                // 30 minutes cooldown
                if (timeDiff < 30 * 60 * 1000) {
                    setHasVoted(true)
                } else {
                    setHasVoted(false)
                }
            }
        }
    }, [userId])

    // Check weather conditions and trigger popup
    useEffect(() => {
        if (!weatherData) {
            console.log("VotePopup: No weather data")
            return
        }
        if (!isAuthenticated) {
            console.log("VotePopup: Not authenticated")
            return
        }
        if (hasVoted) {
            console.log("VotePopup: Already voted (local state)")
            return
        }
        if (isOpen) {
            console.log("VotePopup: Already open")
            return
        }

        let cleanup: (() => void) | undefined

        const checkConditions = () => {
            console.log("VotePopup: Checking conditions...", {
                rain: weatherData.current.rain,
                rain1h: weatherData.current.rain?.["1h"],
                desc: weatherData.current.description,
                humidity: weatherData.current.humidity
            })

            const isRaining =
                (weatherData.current.rain && (weatherData.current.rain["1h"] || 0) > 0) ||
                weatherData.current.description.toLowerCase().includes("rain")

            const isCloudyAndHumid =
                weatherData.current.humidity > 10 &&
                weatherData.current.description.toLowerCase().includes("cloud")

            console.log("VotePopup: Conditions:", { isRaining, isCloudyAndHumid })

            if (isRaining || isCloudyAndHumid) {
                console.log("VotePopup: Conditions met! Opening in 2s...")
                // Add a small delay so it doesn't pop up immediately on load
                const timer = setTimeout(() => {
                    console.log("VotePopup: Opening now")
                    setIsOpen(true)
                }, 2000)
                cleanup = () => clearTimeout(timer)
            } else {
                console.log("VotePopup: Conditions NOT met")
            }
        }

        checkConditions()
        return () => {
            if (cleanup) cleanup()
        }
    }, [weatherData, isAuthenticated, hasVoted, isOpen])

    // Dismiss without local storage (or with short timeout) - now unused for voting, but keeping function if needed
    const handleDismiss = () => {
        setHasVoted(true)
        setIsOpen(false)
        if (userId) {
            localStorage.setItem(`weather_vote_${userId}`, Date.now().toString())
        }
    }

    const handleVote = async (isRaining: boolean | null) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch("/api/weather/vote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    is_raining: isRaining,
                    location: weatherData?.city
                })
            })

            if (response.ok) {
                toast.success(t.weatherVote.thankYou)
                setHasVoted(true)
                setIsOpen(false)
                if (userId) {
                    localStorage.setItem(`weather_vote_${userId}`, Date.now().toString())
                }
            } else {
                const error = await response.json()
                if (response.status === 429) {
                    toast.error(t.weatherVote.alreadyVoted)
                    setHasVoted(true)
                    setIsOpen(false)
                    if (userId) {
                        localStorage.setItem(`weather_vote_${userId}`, Date.now().toString())
                    }
                } else {
                    toast.error(t.weatherVote.error)
                }
            }
        } catch (error) {
            console.error("Vote error:", error)
            toast.error(t.weatherVote.error)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md [&>button]:hidden">
                <DialogHeader>
                    <DialogTitle>{t.weatherVote.title}</DialogTitle>
                    <DialogDescription>
                        {t.weatherVote.description}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center gap-4 py-4">
                    <Button
                        variant="outline"
                        className="flex flex-col h-24 w-24 gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        onClick={() => handleVote(false)}
                    >
                        <Sun className="h-8 w-8" />
                        <span>{t.weatherVote.confirmNoRain}</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex flex-col h-24 w-24 gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        onClick={() => handleVote(true)}
                    >
                        <CloudRain className="h-8 w-8" />
                        <span>{t.weatherVote.confirmRain}</span>
                    </Button>
                </div>
                <DialogFooter className="flex-col sm:justify-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleVote(null)} className="w-full sm:w-auto text-muted-foreground">
                        {t.weatherVote.iDontKnow}
                    </Button>
                    <p className="text-xs text-muted-foreground w-full text-center mt-2">
                        {t.weatherVote.footer}
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

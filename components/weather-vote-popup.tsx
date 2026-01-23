"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useWeatherData } from "@/hooks/use-weather-data"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CloudRain, Sun } from "lucide-react"
import { toast } from "sonner"

export function WeatherVotePopup() {
    const { weatherData } = useWeatherData()
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
        if (!weatherData || !isAuthenticated || hasVoted || isOpen) return

        const checkConditions = () => {
            const isRaining =
                (weatherData.current.rain && (weatherData.current.rain["1h"] || 0) > 0) ||
                weatherData.current.description.toLowerCase().includes("rain")

            const isCloudyAndHumid =
                weatherData.current.humidity > 10 &&
                weatherData.current.description.toLowerCase().includes("cloud")

            if (isRaining || isCloudyAndHumid) {
                // Add a small delay so it doesn't pop up immediately on load
                const timer = setTimeout(() => setIsOpen(true), 2000)
                return () => clearTimeout(timer)
            }
        }

        checkConditions()
    }, [weatherData, isAuthenticated, hasVoted, isOpen])

    const handleDismiss = () => {
        setHasVoted(true)
        setIsOpen(false)
        if (userId) {
            // Set a shorter cooldown for dismissal if desired, but 30m is fine to prevent annoyance
            localStorage.setItem(`weather_vote_${userId}`, Date.now().toString())
        }
    }

    const handleVote = async (isRaining: boolean) => {
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
                toast.success("Thank you for your report!")
                setHasVoted(true)
                setIsOpen(false)
                if (userId) {
                    localStorage.setItem(`weather_vote_${userId}`, Date.now().toString())
                }
            } else {
                const error = await response.json()
                if (response.status === 429) {
                    toast.error("You have already voted recently.")
                    setHasVoted(true)
                    setIsOpen(false)
                    if (userId) {
                        localStorage.setItem(`weather_vote_${userId}`, Date.now().toString())
                    }
                } else {
                    toast.error("Failed to submit vote. Please try again.")
                }
            }
        } catch (error) {
            console.error("Vote error:", error)
            toast.error("An error occurred.")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Weather Report</DialogTitle>
                    <DialogDescription>
                        It looks like it might be raining. Can you confirm the weather at your location?
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center gap-4 py-4">
                    <Button
                        variant="outline"
                        className="flex flex-col h-24 w-24 gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        onClick={() => handleVote(false)}
                    >
                        <Sun className="h-8 w-8" />
                        <span>No Rain</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex flex-col h-24 w-24 gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        onClick={() => handleVote(true)}
                    >
                        <CloudRain className="h-8 w-8" />
                        <span>Raining</span>
                    </Button>
                </div>
                <DialogFooter className="flex-col sm:justify-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleDismiss} className="w-full sm:w-auto text-muted-foreground">
                        I don't know / Not sure
                    </Button>
                    <p className="text-xs text-muted-foreground w-full text-center mt-2">
                        Your report helps the community track flood risks.
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

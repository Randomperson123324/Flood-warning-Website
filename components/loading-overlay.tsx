import React from "react"
import { Loader2, CloudRain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LoadingOverlayProps {
    isLoading: boolean
    message?: string
    children: React.ReactNode
}

export function LoadingOverlay({ isLoading, message = "Retrieving data from database...", children }: LoadingOverlayProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-6 animate-pulse">
                {/* Simulate a grid of cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800">
                            <CardHeader className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Simulate a main chart/content area */}
                <Card className="min-h-[300px] flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">{message}</p>
                        </div>
                    </div>
                    {/* Background skeleton lines */}
                    <div className="w-full h-full p-8 space-y-4 opacity-50">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                </Card>
            </div>
        )
    }

    return <>{children}</>
}

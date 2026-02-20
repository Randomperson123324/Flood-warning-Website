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
                {/* Simulate a grid of cards matching the dashboard layout (3 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className={`bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 relative overflow-hidden ${i === 1 ? 'border-blue-200 dark:border-blue-900 ring-2 ring-blue-100 dark:ring-blue-900/20' : ''}`}>
                            <CardHeader className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            </CardContent>
                            {i === 1 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px]">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 animate-pulse text-center">
                                            {message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1 text-center">
                                            {"รอแป็ป เว็บนี้งบน้อย"}
                                        </p>
                                    </div>
                                </div>
                            )}

                        </Card>
                    ))}
                </div>

                {/* Simulate a main chart/content area */}
                <Card className="min-h-[300px] flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 relative">
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

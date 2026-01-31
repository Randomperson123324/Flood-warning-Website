import React from "react"
import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
    isLoading: boolean
    message?: string
    children: React.ReactNode
}

export function LoadingOverlay({ isLoading, message = "Retrieving data from database...", children }: LoadingOverlayProps) {
    return (
        <div className="relative min-h-[50vh]">
            <div className={`transition-all duration-300 ${isLoading ? "blur-sm pointer-events-none select-none opacity-50" : ""}`}>
                {children}
            </div>

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
                            {message}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

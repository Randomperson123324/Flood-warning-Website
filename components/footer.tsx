import Link from "next/link"
import { Info, Activity, MessageCircle } from "lucide-react"

export function Footer() {
    return (
        <footer className="mt-12 pb-6 text-center space-y-4">
            <div className="flex justify-center items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <Link href="/about" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                    <Info className="h-4 w-4" />
                    About Us
                </Link>
                <a
                    href="https://streeflood.betteruptime.com/th"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                    <Activity className="h-4 w-4" />
                    Status
                </a>
                <a
                    href="YOUR_GOOGLE_FORM_LINK_HERE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                    <MessageCircle className="h-4 w-4" />
                    Contact Us
                </a>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 w-full max-w-md mx-auto">
                <p className="text-xs text-gray-500 font-medium">
                    Vibecoding Project
                </p>
            </div>
        </footer>
    )
}

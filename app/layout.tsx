import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ibmPlexSansThai, playfair } from "@/lib/fonts"
import { LanguageProvider } from "@/hooks/language-context"
import { WeatherVotePopup } from "@/components/weather-vote-popup"
import { WeatherVoteResults } from "@/components/weather-vote-results"

export const metadata: Metadata = {
  title: "Satreepasertsin Weather Center",
  description: "Real-time weather monitoring made by some students",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${ibmPlexSansThai.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <LanguageProvider>
          {children}
          <WeatherVotePopup />
        </LanguageProvider>
      </body>
    </html>
  )
}

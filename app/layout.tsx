import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { IBM_Plex_Sans_Thai } from "next/font/google"
import { LanguageProvider } from "@/hooks/language-context"



// Define IBM Plex Sans Thai font for Thai text
const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"], // Include Thai subset
  weight: ["100", "200", "300", "400", "500", "700"], // Specify weights to load
  variable: "--font-ibm-plex-sans-thai", // Define CSS variable for IBM Plex Sans Thai
  display: "swap",
})

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
    <html lang="en" className={ibmPlexSansThai.variable}>
      <body className="font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}

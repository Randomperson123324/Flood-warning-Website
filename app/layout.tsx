import type { Metadata, Viewport } from "next"
import { IBM_Plex_Sans_Thai, IBM_Plex_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import { SITE_CONFIG } from "@/lib/config"
import "./globals.css"

const bodyFont = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
})

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: SITE_CONFIG.site.name,
  description: "Real-time flood & weather monitoring — ระบบเฝ้าระวังน้ำท่วมและสภาพอากาศแบบเรียลไทม์",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07111c" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className={`${bodyFont.variable} ${monoFont.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

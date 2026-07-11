"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/hooks/use-language"
import { AuthProvider } from "@/hooks/use-auth"
import { AlertWatcherProvider } from "@/hooks/use-browser-notifications"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AlertWatcherProvider>{children}</AlertWatcherProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

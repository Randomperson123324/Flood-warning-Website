"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { defaultLocale, dictionary, translate, type Locale } from "@/lib/i18n/dictionaries"

const STORAGE_KEY = "streeflood:locale"

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: <S extends keyof typeof dictionary>(section: S, key: keyof (typeof dictionary)[S]) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function detectSystemLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale
  return navigator.language?.toLowerCase().startsWith("th") ? "th" : "en"
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with the safe SSR default, then sync to the real system/stored
  // preference on mount — avoids a hydration mismatch between server and
  // client while still being "dynamic every visit" per the brief.
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    setLocaleState(stored ?? detectSystemLocale())
    setHydrated(true)
  }, [])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (section, key) => translate(locale, section, key as never),
    }),
    [locale],
  )

  return (
    <LanguageContext.Provider value={value}>
      <div style={{ visibility: hydrated ? "visible" : "hidden" }}>{children}</div>
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}

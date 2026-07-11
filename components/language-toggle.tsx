"use client"

import { Languages } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { GlassDropdown } from "@/components/ui/glass-dropdown"
import type { Locale } from "@/lib/i18n/dictionaries"

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage()

  return (
    <GlassDropdown<Locale>
      value={locale}
      onChange={setLocale}
      ariaLabel="Language"
      triggerLabel={locale.toUpperCase()}
      triggerIcon={<Languages className="h-4 w-4 text-accent" strokeWidth={2.25} />}
      options={[
        { value: "th", label: "ไทย" },
        { value: "en", label: "English" },
      ]}
    />
  )
}

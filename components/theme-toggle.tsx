"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { GlassDropdown } from "@/components/ui/glass-dropdown"

type ThemeValue = "system" | "light" | "dark"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const current = (mounted ? (theme as ThemeValue) : "system") ?? "system"
  const Icon = current === "system" ? Monitor : current === "light" ? Sun : Moon

  return (
    <GlassDropdown<ThemeValue>
      value={current}
      onChange={setTheme}
      hideLabelOnMobile
      ariaLabel={t("theme", current)}
      triggerIcon={<Icon className="h-4 w-4 text-accent" strokeWidth={2.25} />}
      options={[
        { value: "system", label: t("theme", "system"), icon: <Monitor className="h-4 w-4 text-accent" /> },
        { value: "light", label: t("theme", "light"), icon: <Sun className="h-4 w-4 text-accent" /> },
        { value: "dark", label: t("theme", "dark"), icon: <Moon className="h-4 w-4 text-accent" /> },
      ]}
    />
  )
}

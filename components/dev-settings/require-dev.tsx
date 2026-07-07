"use client"

import { ShieldAlert } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/hooks/use-language"
import type { ReactNode } from "react"

export function RequireDev({ children }: { children: ReactNode }) {
  const { isDev, loading } = useAuth()
  const { t } = useLanguage()

  if (loading) return null

  if (!isDev) {
    return (
      <div className="glass-panel mx-auto mt-8 flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <ShieldAlert className="h-8 w-8 text-status-danger" />
        <p className="text-sm text-ink-soft">{t("devSettings", "accessDenied")}</p>
      </div>
    )
  }

  return <>{children}</>
}

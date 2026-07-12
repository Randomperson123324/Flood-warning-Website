"use client"

import { useState } from "react"
import { Megaphone, X } from "lucide-react"
import { useAnnouncements } from "@/hooks/use-announcements"
import { useLanguage } from "@/hooks/use-language"

export function AnnouncementPopup() {
  const announcements = useAnnouncements()
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  // Only popup-type announcements are shown as a modal. Show one at a time.
  const current = announcements.find((a) => a.type === "popup" && !dismissed.has(a.id))
  if (!current) return null

  function dismiss() {
    setDismissed((prev) => new Set(prev).add(current!.id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-popup-title"
    >
      <button
        type="button"
        aria-label={t("devSettings", "popupClose")}
        onClick={dismiss}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />

      <div className="glass-panel-strong relative flex w-full max-w-md animate-fade-in-up flex-col gap-4 bg-surface-strong/95 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 shrink-0 text-accent" />
            <h2 id="announcement-popup-title" className="text-base font-semibold text-ink">
              {t("devSettings", "popupTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("devSettings", "popupClose")}
            className="glass-interactive rounded-full p-1.5 text-ink-soft"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-ink">{current.message}</p>

        <button
          type="button"
          onClick={dismiss}
          className="glass-panel-strong py-2.5 text-sm font-medium text-accent"
        >
          {t("devSettings", "popupClose")}
        </button>
      </div>
    </div>
  )
}

"use client"

import { Megaphone, TriangleAlert } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAnnouncements } from "@/hooks/use-announcements"
import { cn } from "@/lib/utils"

export function AnnouncementsList() {
  const { t, locale } = useLanguage()
  const announcements = useAnnouncements()

  return (
    <div className="glass-panel animate-fade-in-up p-5">
      <p className="mb-3 text-sm font-medium text-ink-soft">{t("announcements", "title")}</p>

      {announcements.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t("notifications", "noAnnouncements")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {announcements.map((a) => (
            <div key={a.id} className="glass-panel-strong flex items-start gap-2.5 px-3.5 py-2.5 text-sm">
              {a.type === "warning" || a.type === "danger" ? (
                <TriangleAlert className={cn("mt-0.5 h-4 w-4 shrink-0", a.type === "danger" ? "text-status-danger" : "text-status-warning")} />
              ) : (
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              )}
              <div>
                <p>{a.message}</p>
                {a.created_at && (
                  <p className="mt-1 text-xs text-ink-soft">
                    {new Date(a.created_at).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Megaphone, TriangleAlert, X } from "lucide-react"
import { useAnnouncements } from "@/hooks/use-announcements"
import { cn } from "@/lib/utils"

export function AnnouncementBanner() {
  const announcements = useAnnouncements()
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const visible = announcements.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className={cn(
            "glass-panel flex animate-fade-in-up items-center gap-2.5 px-4 py-2.5 text-sm",
            a.type === "warning" && "text-status-warning",
            a.type === "danger" && "text-status-danger",
          )}
        >
          {a.type === "warning" || a.type === "danger" ? (
            <TriangleAlert className="h-4 w-4 shrink-0" />
          ) : (
            <Megaphone className="h-4 w-4 shrink-0 text-accent" />
          )}
          <span className="flex-1">{a.message}</span>
          <button type="button" onClick={() => setDismissed((prev) => new Set(prev).add(a.id))} aria-label="dismiss">
            <X className="h-4 w-4 text-ink-soft" />
          </button>
        </div>
      ))}
    </div>
  )
}

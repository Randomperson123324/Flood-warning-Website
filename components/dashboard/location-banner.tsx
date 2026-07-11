"use client"

import { LocateFixed, MapPinned, RotateCw, TriangleAlert } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import type { GeolocationStatus } from "@/hooks/use-geolocation"
import type { UserLocation } from "@/types"
import { cn } from "@/lib/utils"

interface LocationBannerProps {
  status: GeolocationStatus
  location: UserLocation | null
  onRetry: () => void
}

export function LocationBanner({ status, location, onRetry }: LocationBannerProps) {
  const { t } = useLanguage()

  if (status === "resolving") {
    return (
      <BannerShell tone="neutral">
        <RotateCw className="h-4 w-4 animate-spin text-accent" />
        <span>{t("location", "resolving")}</span>
      </BannerShell>
    )
  }

  if (status === "unavailable" || !location) {
    return (
      <BannerShell tone="warning">
        <TriangleAlert className="h-4 w-4" />
        <span className="flex-1">{t("location", "fallbackDefault")}</span>
        <RetryButton onRetry={onRetry} label={t("location", "retry")} />
      </BannerShell>
    )
  }

  if (location.source === "gps") {
    return (
      <BannerShell tone="normal">
        <LocateFixed className="h-4 w-4" />
        <span>{t("location", "gpsGranted")}</span>
      </BannerShell>
    )
  }

  return (
    <BannerShell tone="warning">
      <MapPinned className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {t("location", "ipFallback")}
        {location.approximateCity ? ` (${location.approximateCity})` : ""}
      </span>
      <RetryButton onRetry={onRetry} label={t("location", "enableGps")} />
    </BannerShell>
  )
}

function RetryButton({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="glass-panel-strong glass-interactive shrink-0 px-3 py-1.5 text-xs font-medium"
    >
      {label}
    </button>
  )
}

function BannerShell({ tone, children }: { tone: "normal" | "warning" | "neutral"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "glass-panel mx-auto flex max-w-6xl animate-fade-in-up items-center gap-2 px-4 py-2.5 text-sm",
        tone === "warning" && "text-status-warning",
        tone === "normal" && "text-status-normal",
        tone === "neutral" && "text-ink-soft",
      )}
    >
      {children}
    </div>
  )
}

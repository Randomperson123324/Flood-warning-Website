"use client"

import { Bell, BellOff, BellRing } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAlertWatcher } from "@/hooks/use-browser-notifications"

export function NotificationPermissionCard() {
  const { t } = useLanguage()
  const { permission, requestPermission } = useAlertWatcher()

  return (
    <div className="glass-panel animate-fade-in-up p-5">
      {permission === "unsupported" && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <BellOff className="h-4 w-4" />
          {t("notifications", "browserUnsupported")}
        </p>
      )}

      {permission === "default" && (
        <button
          type="button"
          onClick={requestPermission}
          className="glass-panel-strong flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.01]"
        >
          <Bell className="h-4 w-4" />
          {t("notifications", "enableBrowser")}
        </button>
      )}

      {permission === "granted" && (
        <p className="flex items-center gap-2 text-sm text-status-normal">
          <BellRing className="h-4 w-4" />
          {t("notifications", "browserEnabled")}
        </p>
      )}

      {permission === "denied" && (
        <p className="flex items-center gap-2 text-sm text-status-warning">
          <BellOff className="h-4 w-4" />
          {t("notifications", "browserDenied")}
        </p>
      )}
    </div>
  )
}

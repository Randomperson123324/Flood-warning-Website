"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { RequireDev } from "@/components/dev-settings/require-dev"
import { SensorManager } from "@/components/dev-settings/sensor-manager"
import { AffectedAreasManager } from "@/components/dev-settings/affected-areas-manager"
import { AnnouncementManager } from "@/components/dev-settings/announcement-manager"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"

type Tab = "sensors" | "areas" | "announcements"

export default function DevSettingsPage() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>("sensors")

  return (
    <main className="min-h-dvh pb-16">
      <Header />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <h1 className="text-lg font-semibold">{t("devSettings", "title")}</h1>

        <RequireDev>
          <div className="glass-panel-strong flex w-fit gap-1 p-1">
            <TabButton active={tab === "sensors"} onClick={() => setTab("sensors")}>
              {t("devSettings", "sensorsTab")}
            </TabButton>
            <TabButton active={tab === "areas"} onClick={() => setTab("areas")}>
              {t("devSettings", "areasTab")}
            </TabButton>
            <TabButton active={tab === "announcements"} onClick={() => setTab("announcements")}>
              {t("devSettings", "announcementsTab")}
            </TabButton>
          </div>

          {tab === "sensors" && <SensorManager />}
          {tab === "areas" && <AffectedAreasManager />}
          {tab === "announcements" && <AnnouncementManager />}
        </RequireDev>
      </div>
    </main>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-glass-sm px-4 py-1.5 text-sm font-medium transition-colors duration-200",
        active ? "bg-accent/15 text-accent" : "text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  )
}

"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { ChatPanel } from "@/components/community/chat-panel"
import { FloodReportForm } from "@/components/community/flood-report-form"
import { FloodReportsList } from "@/components/community/flood-reports-list"
import { WeatherVoteWidget } from "@/components/community/weather-vote-widget"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"

type Tab = "chat" | "reports"

export default function CommunityPage() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>("chat")

  return (
    <main className="min-h-dvh pb-16">
      <Header />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <AnnouncementBanner />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <div className="glass-panel-strong flex w-fit gap-1 p-1">
              <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
                {t("community", "chatTab")}
              </TabButton>
              <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>
                {t("community", "reportsTab")}
              </TabButton>
            </div>

            {tab === "chat" ? (
              <ChatPanel />
            ) : (
              <div className="flex flex-col gap-4">
                <FloodReportForm />
                <FloodReportsList />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <WeatherVoteWidget location="ทั่วไป" />
          </div>
        </div>
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

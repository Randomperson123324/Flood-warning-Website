"use client"

import { useLanguage } from "@/hooks/use-language"
import { useFloodReports } from "@/hooks/use-flood-reports"
import { cn } from "@/lib/utils"
import type { ReportSeverity } from "@/types"

const SEVERITY_CLASS: Record<ReportSeverity, string> = {
  low: "text-status-normal",
  moderate: "text-status-warning",
  high: "text-status-warning",
  critical: "text-status-danger",
}

const SEVERITY_LABEL_KEY: Record<ReportSeverity, "severityLow" | "severityModerate" | "severityHigh" | "severityCritical"> = {
  low: "severityLow",
  moderate: "severityModerate",
  high: "severityHigh",
  critical: "severityCritical",
}

export function FloodReportsList() {
  const { t, locale } = useLanguage()
  const { reports, loading } = useFloodReports()

  if (loading) return <div className="glass-shimmer h-40 animate-shimmer rounded-glass" />
  if (reports.length === 0) return <p className="glass-panel p-6 text-center text-sm text-ink-soft">{t("reports", "empty")}</p>

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => (
        <div key={report.id} className="glass-panel animate-fade-in-up p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="font-medium">{report.area_name}</p>
            <span className={cn("glass-panel-strong rounded-full px-2.5 py-0.5 text-xs font-medium", SEVERITY_CLASS[report.severity])}>
              {t("reports", SEVERITY_LABEL_KEY[report.severity])}
            </span>
          </div>
          <p className="text-sm text-ink-soft">{report.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
            <span>{report.users?.username ?? t("reports", "anonymous")}</span>
            <span>·</span>
            <span>
              {report.created_at &&
                new Date(report.created_at).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

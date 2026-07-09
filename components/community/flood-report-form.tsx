"use client"

import { useState } from "react"
import Link from "next/link"
import { LoaderCircle, MapPin, Send } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { useFloodReports } from "@/hooks/use-flood-reports"
import { useAffectedAreas } from "@/hooks/use-affected-areas"
import { SITE_CONFIG } from "@/lib/config"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { glassInputClass } from "@/components/auth/auth-shell"
import type { ReportSeverity } from "@/types"

const SEVERITIES: { value: ReportSeverity; key: "severityLow" | "severityModerate" | "severityHigh" | "severityCritical" }[] = [
  { value: "low", key: "severityLow" },
  { value: "moderate", key: "severityModerate" },
  { value: "high", key: "severityHigh" },
  { value: "critical", key: "severityCritical" },
]

const SEVERITY_COLOR: Record<ReportSeverity, string> = {
  low: "text-status-normal",
  moderate: "text-status-warning",
  high: "text-status-warning",
  critical: "text-status-danger",
}

export function FloodReportForm() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { submitReport } = useFloodReports()
  const { areas, loading: areasLoading } = useAffectedAreas()

  const [selectedAreaId, setSelectedAreaId] = useState<string>("")
  const [severity, setSeverity] = useState<ReportSeverity>("moderate")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileAvailable, setTurnstileAvailable] = useState<boolean | null>(null)
  const needsTurnstile = turnstileAvailable === true
  const selectedArea = areas.find((a) => a.id === selectedAreaId)
  const canSubmit = selectedArea && description.trim() && (!needsTurnstile || turnstileToken)

  if (!user) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="mb-3 text-sm text-ink-soft">{t("reports", "loginRequired")}</p>
        <Link href="/auth/login" className="glass-panel-strong inline-block px-4 py-2 text-sm font-medium text-accent">
          {t("nav", "login")}
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedArea) return
    setSubmitting(true)
    setError(null)
    const { error } = await submitReport({ area_name: selectedArea.name, severity, description, turnstileToken })
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setSuccess(true)
    setSelectedAreaId("")
    setDescription("")
    setTimeout(() => setSuccess(false), SITE_CONFIG.community.floodReportSuccessDurationMs)
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-4 p-5">
      <p className="text-sm font-medium text-ink-soft">{t("reports", "title")}</p>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-soft">{t("reports", "selectArea")}</p>
        {areasLoading ? (
          <p className="text-sm text-ink-soft">{t("common", "loading")}</p>
        ) : areas.length === 0 ? (
          <p className="text-sm text-ink-soft">{t("reports", "noAreas")}</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {areas.map((area) => {
              const active = area.id === selectedAreaId
              return (
                <button
                  type="button"
                  key={area.id}
                  onClick={() => setSelectedAreaId(area.id)}
                  aria-pressed={active}
                  className={`glass-panel-strong flex shrink-0 items-start gap-3 p-3 text-left transition-all ${
                    active ? "ring-1 ring-accent" : "hover:scale-[1.01]"
                  }`}
                >
                  <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent" : "text-ink-soft"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${active ? "text-accent" : ""}`}>{area.name}</p>
                    {area.description && <p className="truncate text-xs text-ink-soft">{area.description}</p>}
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {t("reports", "areaThreshold")}: {area.water_level_threshold} cm
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {SEVERITIES.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => setSeverity(s.value)}
            className={`glass-panel-strong flex-1 py-2 text-xs font-medium transition-all ${
              severity === s.value ? `ring-1 ring-accent ${SEVERITY_COLOR[s.value]}` : "text-ink-soft"
            }`}
          >
            {t("reports", s.key)}
          </button>
        ))}
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("reports", "description")}
        rows={3}
        maxLength={1000}
        className={`${glassInputClass} resize-none`}
      />

      <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} onAvailability={setTurnstileAvailable} />

      {error && <p className="text-sm text-status-danger">{error}</p>}
      {success && <p className="text-sm text-status-normal">{t("reports", "submitted")}</p>}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="glass-panel-strong flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.01] disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {t("reports", "submit")}
      </button>
    </form>
  )
}

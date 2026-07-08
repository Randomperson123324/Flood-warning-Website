"use client"

import { useState } from "react"
import { ExternalLink, FileText, TriangleAlert, X } from "lucide-react"
import { useTMDWarning } from "@/hooks/use-tmd-warning"
import { useLanguage } from "@/hooks/use-language"

// Official TMD weather warning portal — used for the "See more" link.
const TMD_WARNING_URL_TH = "https://www.tmd.go.th/warningList"
const TMD_WARNING_URL_EN = "https://www.tmd.go.th/en/warningList"

export function TMDWarningBanner() {
  const { warning } = useTMDWarning()
  const { locale, t } = useLanguage()
  const [dismissed, setDismissed] = useState(false)

  if (!warning || !warning.hasWarning || dismissed) return null

  const isThai = locale === "th"
  const title = isThai ? warning.titleThai : warning.titleEnglish
  const headline = isThai ? warning.headlineThai : warning.headlineEnglish
  const description = isThai ? warning.descriptionThai : warning.descriptionEnglish
  const advisoryDocUrl = isThai ? warning.webUrlThai : warning.webUrlEnglish
  const tmdUrl = isThai ? TMD_WARNING_URL_TH : TMD_WARNING_URL_EN

  return (
    <div className="glass-panel flex animate-fade-in-up flex-col gap-2 border-l-4 border-status-danger px-4 py-3 text-status-danger">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{t("tmdWarning", "badge")}</p>
          {(title || headline) && <h2 className="text-pretty text-sm font-semibold leading-relaxed">{title || headline}</h2>}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="dismiss"
          className="shrink-0 text-ink-soft transition-opacity hover:opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {description && <p className="text-pretty pl-7 text-sm leading-relaxed text-ink">{description}</p>}

      <div className="flex flex-wrap items-center gap-4 pl-7 pt-1">
        <a
          href={tmdUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          {t("tmdWarning", "seeMore")}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>

        {advisoryDocUrl && (
          <a
            href={advisoryDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-80"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {t("tmdWarning", "advisoryDoc")}
          </a>
        )}
      </div>
    </div>
  )
}

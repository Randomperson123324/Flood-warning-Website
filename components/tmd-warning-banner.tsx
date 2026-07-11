"use client"

import { useState } from "react"
import { ChevronDown, ExternalLink, FileText, Languages, TriangleAlert, X } from "lucide-react"
import { useTMDWarning } from "@/hooks/use-tmd-warning"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"

const TMD_URL = "https://www.tmd.go.th/"

export function TMDWarningBanner() {
  const { warning } = useTMDWarning()
  const { locale, t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // AI translation state
  const [translated, setTranslated] = useState<{ title?: string; headline?: string; description?: string } | null>(null)
  const [showTranslated, setShowTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState(false)
  const [translationSource, setTranslationSource] = useState<"ai" | "cached" | null>(null)

  if (!warning || !warning.hasWarning || dismissed) return null

  const isThai = locale === "th"
  const badge = t("tmdWarning", "badge")

  // The backend might not have an English translation yet. If it's missing, offer manual translation.
  const englishMissing =
    !isThai && !warning.titleEnglish && !warning.headlineEnglish && !warning.descriptionEnglish

  const useThaiSource = isThai || englishMissing

  const srcTitle = (useThaiSource ? warning.titleThai : warning.titleEnglish) || badge
  const srcHeadline = useThaiSource ? warning.headlineThai : warning.headlineEnglish
  const srcDescription = useThaiSource ? warning.descriptionThai : warning.descriptionEnglish

  // Swap in translated strings
  const title = showTranslated && translated ? translated.title || srcTitle : srcTitle
  const headline = showTranslated && translated ? translated.headline || srcHeadline : srcHeadline
  const description = showTranslated && translated ? translated.description || srcDescription : srcDescription

  const advisoryUrl = (isThai ? warning.webUrlThai : warning.webUrlEnglish) || warning.webUrlThai || TMD_URL
  const hasBody = Boolean(headline || description)

  async function handleTranslate() {
    if (translated) {
      setShowTranslated(true)
      return
    }
    setTranslating(true)
    setTranslateError(false)
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "English",
          issueNo: warning!.issueNo,
          fields: {
            title: warning!.titleThai,
            headline: warning!.headlineThai,
            description: warning!.descriptionThai,
          },
        }),
      })
      if (!res.ok) throw new Error("translate failed")
      const data = (await res.json()) as { translations: Record<string, string>; cached: boolean }
      setTranslated(data.translations)
      setTranslationSource(data.cached ? "cached" : "ai")
      setShowTranslated(true)
      setExpanded(true)
    } catch {
      setTranslateError(true)
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="glass-panel animate-fade-in-up overflow-hidden text-status-danger">
      <div className="flex items-start gap-3 px-4 py-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

        <div className="flex-1">
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-status-danger/80">{badge}</p>
          <p className="mt-0.5 text-sm font-semibold leading-relaxed text-pretty text-ink">{title}</p>

          {showTranslated && translated && (
            <p className="mt-1 inline-flex items-center gap-1 text-[0.7rem] text-ink-soft">
              <Languages className="h-3 w-3" />
              {t("tmdWarning", "translatedNote")}
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide",
                translationSource === "cached"
                  ? "bg-sky-500/15 text-sky-400"
                  : "bg-violet-500/15 text-violet-400"
              )}>
                {translationSource === "cached" ? "Saved" : "AI"}
              </span>
            </p>
          )}

          {expanded && hasBody && (
            <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-ink-soft">
              {headline && <p className="text-pretty">{headline}</p>}
              {description && <p className="whitespace-pre-line text-pretty">{description}</p>}
            </div>
          )}

          {translateError && (
            <p className="mt-2 text-xs text-status-danger">{t("tmdWarning", "translateError")}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasBody && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="glass-panel-strong glass-interactive inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink"
                aria-expanded={expanded}
              >
                {expanded ? t("tmdWarning", "seeLess") : t("tmdWarning", "seeMore")}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", expanded && "rotate-180")} />
              </button>
            )}

            {!isThai && !showTranslated && (
              <button
                type="button"
                onClick={handleTranslate}
                disabled={!englishMissing || translating}
                className={cn(
                  "glass-panel-strong glass-interactive inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink",
                  (!englishMissing || translating) && "opacity-60 cursor-not-allowed"
                )}
                title={!englishMissing ? "Official translation already provided" : undefined}
              >
                {translating ? t("tmdWarning", "translating") : t("tmdWarning", "translate")}
                <Languages className="h-3.5 w-3.5" />
              </button>
            )}

            {!isThai && showTranslated && (
              <button
                type="button"
                onClick={() => setShowTranslated(false)}
                className="glass-panel-strong glass-interactive inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink"
              >
                {t("tmdWarning", "showOriginal")}
                <Languages className="h-3.5 w-3.5" />
              </button>
            )}

            <a
              href={TMD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel-strong glass-interactive inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink"
            >
              {t("tmdWarning", "goToTmd")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <a
              href={advisoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel-strong glass-interactive inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink"
            >
              {t("tmdWarning", "advisoryDoc")}
              <FileText className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <button type="button" onClick={() => setDismissed(true)} aria-label="dismiss" className="glass-interactive rounded-full p-1">
          <X className="h-4 w-4 text-ink-soft" />
        </button>
      </div>
    </div>
  )
}

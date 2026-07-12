"use client"

import { useState } from "react"
import { CloudRain, CloudSun, ExternalLink, Landmark, Megaphone, ShieldAlert, Waves } from "lucide-react"
import { Header } from "@/components/header"
import { useGovData } from "@/hooks/use-gov-data"
import { useLanguage } from "@/hooks/use-language"
import type { GovAnnouncement } from "@/lib/gov/tmd-news"
import type { GovDailyForecast } from "@/lib/gov/tmd-forecast"
import type { GovRiverSituation } from "@/lib/gov/thaiwater"
import { RAIN_HEAVY_MM, RAIN_VERY_HEAVY_MM, RIVER_OVERFLOW_LEVEL } from "@/lib/gov/thaiwater"

/** Feed timestamps look like "2026-07-10 16:13:15" (Thai local time, no zone). */
function formatFeedDate(value: string, locale: string): string {
  if (!value) return ""
  const date = new Date(value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function AnnouncementCard({ announcement }: { announcement: GovAnnouncement }) {
  const { t, locale } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  // The feed is Thai-first — English fields are sometimes blank, so fall back.
  const pick = (th: string, en: string) => (locale === "en" && en ? en : th)
  const title = pick(announcement.titleThai, announcement.titleEnglish)
  const headline = pick(announcement.headlineThai, announcement.headlineEnglish)
  const description = pick(announcement.descriptionThai, announcement.descriptionEnglish)
  const webUrl = pick(announcement.webUrlThai, announcement.webUrlEnglish)

  return (
    <div className="glass-panel-strong p-4">
      <p className="text-sm font-semibold leading-snug">{title}</p>
      {headline && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{headline}</p>}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {announcement.announceDate && (
          <span>
            {t("gov", "issued")} {formatFeedDate(announcement.announceDate, locale)}
          </span>
        )}
        {announcement.effectEnd && (
          <span>
            {t("gov", "effective")} {formatFeedDate(announcement.effectEnd, locale)}
          </span>
        )}
      </div>

      {expanded && description && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {description && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {expanded ? t("tmdWarning", "seeLess") : t("tmdWarning", "seeMore")}
          </button>
        )}
        {webUrl && (
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            {t("gov", "readFull")}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

function ForecastBody({ forecast }: { forecast: GovDailyForecast }) {
  const { t, locale } = useLanguage()
  const [showRegions, setShowRegions] = useState(false)

  const pick = (v: { th: string; en: string }) => (locale === "en" && v.en ? v.en : v.th)

  return (
    <div>
      {forecast.issuedText && <p className="mb-2 text-xs text-ink-soft">{forecast.issuedText}</p>}
      <p className="whitespace-pre-line text-sm leading-relaxed">{pick(forecast.overall)}</p>

      {forecast.regions.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowRegions((v) => !v)}
            className="mt-3 text-xs font-medium text-accent hover:underline"
          >
            {showRegions ? t("tmdWarning", "seeLess") : t("gov", "forecastRegions")}
          </button>
          {showRegions && (
            <div className="mt-3 flex flex-col gap-2">
              {forecast.regions.map((r, i) => (
                <div key={i} className="glass-panel-strong p-3">
                  <p className="text-sm font-medium">{pick(r.region)}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{pick(r.description)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RiverBody({ situation }: { situation: GovRiverSituation }) {
  const { t, locale } = useLanguage()

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-status-danger">
          {t("gov", "riverOverflow")}: {situation.overflowCount}
        </span>
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-status-warning">
          {t("gov", "riverHigh")}: {situation.highCount}
        </span>
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-ink-soft">
          {t("gov", "riverStationsTotal")}: {situation.totalStations}
        </span>
      </div>

      {situation.critical.length === 0 ? (
        <p className="py-4 text-center text-sm text-status-normal">{t("gov", "riverAllNormal")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {situation.critical.map((s, i) => {
            const overflowing = s.situationLevel >= RIVER_OVERFLOW_LEVEL
            return (
              <li key={`${s.stationName}-${i}`} className="glass-panel-strong flex items-center gap-3 p-3">
                <Waves className={`h-4 w-4 shrink-0 ${overflowing ? "text-status-danger" : "text-status-warning"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.stationName}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {[s.river, locale === "th" ? s.amphoe.th : s.amphoe.en, locale === "th" ? s.province.th : s.province.en]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${overflowing ? "text-status-danger" : "text-status-warning"}`}>
                    {overflowing ? t("gov", "riverOverflow") : t("gov", "riverHigh")}
                  </p>
                  <p className="text-[10px] text-ink-soft">
                    {s.waterlevelMsl !== null && `${s.waterlevelMsl.toFixed(2)} ${t("gov", "msl")}`}
                    {s.waterlevelMsl !== null && s.storagePercent !== null && " · "}
                    {s.storagePercent !== null && `${s.storagePercent.toFixed(0)}% ${t("gov", "riverBank")}`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SectionShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/* Sections are grouped per agency under one heading, so individual sections
   no longer repeat where their data comes from. */
function AgencyGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 px-1 pt-2">
        <span className="glass-panel-strong flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
          <Landmark className="h-3.5 w-3.5 text-accent" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="h-px min-w-4 flex-1 bg-gradient-to-r from-border/40 to-transparent" />
      </div>
      {children}
    </div>
  )
}

export default function GovDataPage() {
  const { t, locale } = useLanguage()
  const { data, loading, error } = useGovData()

  const emptyNote = (text: string) => <p className="py-4 text-center text-sm text-ink-soft">{text}</p>
  const sectionError = emptyNote(t("gov", "sectionError"))

  return (
    <main className="min-h-dvh pb-16">
      <Header />

      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <div className="glass-panel animate-fade-in-up p-5">
          <div className="flex items-center gap-2.5">
            <span className="glass-panel-strong flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Landmark className="h-5 w-5 text-accent" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{t("gov", "title")}</h1>
              <p className="text-sm text-ink-soft">{t("gov", "subtitle")}</p>
            </div>
          </div>
          {data && (
            <p className="mt-3 text-xs text-ink-soft">
              {t("status", "lastUpdated")}:{" "}
              {new Date(data.timestamp).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {error && <div className="glass-panel p-4 text-sm text-status-danger">{error}</div>}

        {loading ? (
          <>
            <div className="glass-panel h-36 animate-pulse" />
            <div className="glass-panel h-36 animate-pulse" />
            <div className="glass-panel h-36 animate-pulse" />
            <div className="glass-panel h-48 animate-pulse" />
            <div className="glass-panel h-64 animate-pulse" />
          </>
        ) : (
          data && (
            <>
              <AgencyGroup title={t("gov", "tmdGroup")}>
                <div className="animate-fade-in-up delay-75">
                  <SectionShell
                    icon={<Megaphone className="h-4 w-4 text-accent" />}
                    title={t("gov", "announcementsTitle")}
                  >
                    {data.announcements === null ? (
                      sectionError
                    ) : data.announcements.length === 0 ? (
                      emptyNote(t("gov", "noAnnouncements"))
                    ) : (
                      <div className="flex flex-col gap-3">
                        {data.announcements.map((a, i) => (
                          <AnnouncementCard key={`${a.issueNo}-${i}`} announcement={a} />
                        ))}
                      </div>
                    )}
                  </SectionShell>
                </div>

                <div className="animate-fade-in-up delay-100">
                  <SectionShell icon={<CloudSun className="h-4 w-4 text-accent" />} title={t("gov", "forecastTitle")}>
                    {data.forecast === null ? sectionError : <ForecastBody forecast={data.forecast} />}
                  </SectionShell>
                </div>
              </AgencyGroup>

              <AgencyGroup title={t("gov", "hiiGroup")}>
                <div className="animate-fade-in-up delay-150">
                  <SectionShell
                    icon={<ShieldAlert className="h-4 w-4 text-status-warning" />}
                    title={t("gov", "warningsTitle")}
                  >
                    {data.waterWarnings === null ? (
                      sectionError
                    ) : data.waterWarnings.length === 0 ? (
                      emptyNote(t("gov", "noWarnings"))
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {data.waterWarnings.map((w, i) => (
                          <li key={i} className="glass-panel-strong flex flex-col gap-1 p-3">
                            <span className="text-xs font-medium text-status-warning">
                              {formatFeedDate(w.datetime, locale)}
                            </span>
                            <span className="text-sm leading-relaxed">{w.message}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionShell>
                </div>

                <div className="animate-fade-in-up delay-200">
                  <SectionShell icon={<Waves className="h-4 w-4 text-accent" />} title={t("gov", "riverTitle")}>
                    {data.riverSituation === null ? sectionError : <RiverBody situation={data.riverSituation} />}
                  </SectionShell>
                </div>

                <div className="animate-fade-in-up delay-300">
                  <SectionShell icon={<CloudRain className="h-4 w-4 text-accent" />} title={t("gov", "rainfallTitle")}>
                    {data.rainfall === null ? (
                      sectionError
                    ) : data.rainfall.length === 0 ? (
                      emptyNote(t("status", "noData"))
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {data.rainfall.map((s, i) => {
                          const veryHeavy = s.rain24h > RAIN_VERY_HEAVY_MM
                          const heavy = s.rain24h > RAIN_HEAVY_MM
                          return (
                            <li key={`${s.stationName}-${i}`} className="glass-panel-strong flex items-center gap-3 p-3">
                              <span className="w-6 shrink-0 text-center text-sm font-semibold text-ink-soft">{i + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {t("gov", "rainfallStation")}{s.stationName ? ` ${s.stationName}` : ""}
                                </p>
                                <p className="truncate text-xs text-ink-soft">
                                  {locale === "th"
                                    ? `${s.amphoe.th} · ${s.province.th}${s.agency.th ? ` · ${s.agency.th}` : ""}`
                                    : `${s.amphoe.en} · ${s.province.en}${s.agency.en ? ` · ${s.agency.en}` : ""}`}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p
                                  className={`text-sm font-semibold ${
                                    veryHeavy ? "text-status-danger" : heavy ? "text-status-warning" : "text-accent"
                                  }`}
                                >
                                  {s.rain24h.toFixed(1)} {t("gov", "mm")}
                                </p>
                                {heavy && (
                                  <p className={`text-[10px] font-medium ${veryHeavy ? "text-status-danger" : "text-status-warning"}`}>
                                    {veryHeavy ? t("gov", "rainVeryHeavy") : t("gov", "rainHeavy")}
                                  </p>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </SectionShell>
                </div>
              </AgencyGroup>
            </>
          )
        )}
      </div>
    </main>
  )
}

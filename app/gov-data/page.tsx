"use client"

import { useEffect, useState } from "react"
import { ChevronDown, CloudRain, CloudSun, Droplets, ExternalLink, Globe, Landmark, LocateFixed, Megaphone, RotateCw, ShieldAlert, Waves } from "lucide-react"
import { Header } from "@/components/header"
import { SiteFooter } from "@/components/site-footer"
import { useGovData } from "@/hooks/use-gov-data"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useNearbyGovStations } from "@/hooks/use-nearby-gov-stations"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"
import type { GovAnnouncement } from "@/lib/gov/tmd-news"
import type { GovDailyForecast } from "@/lib/gov/tmd-forecast"
import type { GovRiverSituation, GovWarningAlert } from "@/lib/gov/thaiwater"
import { RAIN_HEAVY_MM, RAIN_VERY_HEAVY_MM, RIVER_OVERFLOW_LEVEL } from "@/lib/gov/thaiwater"
import type { GovReservoirSituation } from "@/lib/gov/rid-reservoir"
import { RESERVOIR_HIGH_PERCENT, RESERVOIR_OVER_PERCENT } from "@/lib/gov/rid-reservoir"

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

/** Shared list row for every station/reservoir list on this page.
 *
 * Desktop (sm+): marker + name + value on the top line, the location detail
 * on its own full-width line beneath — always visible.
 * Mobile: compact single line (name truncated) with a chevron; tapping the
 * row expands it, un-truncating the name and revealing the detail line, so
 * every piece of data stays reachable without cramming the small screen. */
function DataRow({
  marker,
  title,
  subtitle,
  value,
  valueClass,
  label,
  labelClass,
  tooltip,
}: {
  marker: React.ReactNode
  title: string
  subtitle?: string
  value: string
  valueClass: string
  label?: string
  labelClass?: string
  tooltip?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li
      className="glass-panel-strong cursor-pointer p-3 sm:cursor-auto"
      title={tooltip}
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{marker}</span>
          <p className={`min-w-0 pt-px text-sm font-medium ${expanded ? "" : "truncate sm:whitespace-normal"}`}>{title}</p>
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          <div className="text-right">
            <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
            {label && <p className={`text-[10px] font-medium ${labelClass ?? "text-ink-soft"}`}>{label}</p>}
          </div>
          <ChevronDown
            className={`mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform duration-200 sm:hidden ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {subtitle && (
        <p className={`mt-0.5 pl-[30px] text-xs text-ink-soft ${expanded ? "" : "hidden sm:block"}`}>{subtitle}</p>
      )}
    </li>
  )
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

function RiverBody({ situation, provinceFilter }: { situation: GovRiverSituation; provinceFilter?: string }) {
  const { t, locale } = useLanguage()

  // Filtered mode lists only the viewer's province; the nationwide summary
  // chips would contradict that list, so they're hidden there.
  const critical = provinceFilter
    ? situation.critical.filter((s) => s.province.th === provinceFilter)
    : situation.critical

  return (
    <div>
      {!provinceFilter && (
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
      )}

      {critical.length === 0 ? (
        <p className="py-4 text-center text-sm text-status-normal">
          {provinceFilter ? t("gov", "localRiverNone") : t("gov", "riverAllNormal")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {critical.map((s, i) => {
            const overflowing = s.situationLevel >= RIVER_OVERFLOW_LEVEL
            return (
              <DataRow
                key={`${s.stationName}-${i}`}
                marker={<Waves className={`h-4 w-4 ${overflowing ? "text-status-danger" : "text-status-warning"}`} />}
                title={s.stationName}
                subtitle={[s.river, locale === "th" ? s.amphoe.th : s.amphoe.en, locale === "th" ? s.province.th : s.province.en]
                  .filter(Boolean)
                  .join(" · ")}
                value={overflowing ? t("gov", "riverOverflow") : t("gov", "riverHigh")}
                valueClass={overflowing ? "text-status-danger" : "text-status-warning"}
                label={
                  [
                    s.waterlevelMsl !== null ? `${s.waterlevelMsl.toFixed(2)} ${t("gov", "msl")}` : null,
                    s.storagePercent !== null ? `${s.storagePercent.toFixed(0)}% ${t("gov", "riverBank")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Measurement windows the feed uses, e.g. "1ชม." (1 hr), "สะสม" (running
 * total since 07:00), "3วัน", "วานนี้". Anything new falls through as-is. */
function warningPeriodLabel(periodType: string, locale: string): string {
  const map: Record<string, { th: string; en: string }> = {
    "1ชม.": { th: "ฝน 1 ชม.", en: "1-hr rain" },
    สะสม: { th: "ฝนสะสม", en: "Accumulated" },
    "3วัน": { th: "ฝน 3 วัน", en: "3-day rain" },
    วานนี้: { th: "ฝนเมื่อวาน", en: "Yesterday" },
  }
  const label = map[periodType]
  if (!label) return `ฝน${periodType}`
  return locale === "th" ? label.th : label.en
}

const WARNINGS_COLLAPSED_COUNT = 6

function WarningsBody({ alerts, provinceFilter }: { alerts: GovWarningAlert[]; provinceFilter?: string }) {
  const { t, locale } = useLanguage()
  const [showAll, setShowAll] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  // Unparseable alerts can't be attributed to a province, so filtered mode
  // leaves them out rather than showing possibly-irrelevant ones.
  const scoped = provinceFilter ? alerts.filter((a) => a.parsed && a.province === provinceFilter) : alerts

  const flashFloodCount = scoped.filter((a) => a.flashFloodRisk).length
  const veryHeavyCount = scoped.filter((a) => a.veryHeavy).length
  // Most urgent first: flash-flood risk, then very heavy rain — the feed is
  // already newest-first, which stable sort preserves within each tier.
  const sorted = [...scoped].sort(
    (a, b) =>
      Number(b.flashFloodRisk) - Number(a.flashFloodRisk) || Number(b.veryHeavy) - Number(a.veryHeavy),
  )
  const visible = showAll ? sorted : sorted.slice(0, WARNINGS_COLLAPSED_COUNT)

  if (provinceFilter && scoped.length === 0) {
    return <p className="py-4 text-center text-sm text-status-normal">{t("gov", "localNoWarnings")}</p>
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-status-danger">
          {t("gov", "warnFlashFlood")}: {flashFloodCount}
        </span>
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-status-warning">
          {t("gov", "rainVeryHeavy")}: {veryHeavyCount}
        </span>
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-ink-soft">
          {t("gov", "warnTotal")}: {scoped.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {visible.map((a, i) =>
          showRaw || !a.parsed ? (
            <li key={i} className="glass-panel-strong flex flex-col gap-1 p-3">
              <span className="text-xs font-medium text-status-warning">{formatFeedDate(a.datetime, locale)}</span>
              <span className="text-sm leading-relaxed">{a.raw}</span>
            </li>
          ) : (
            <DataRow
              key={i}
              tooltip={a.periodRange}
              marker={
                a.flashFloodRisk ? (
                  <ShieldAlert className="h-4 w-4 text-status-danger" />
                ) : (
                  <CloudRain className={`h-4 w-4 ${a.veryHeavy ? "text-status-danger" : "text-status-warning"}`} />
                )
              }
              title={a.station}
              subtitle={`อ.${a.amphoe} · จ.${a.province} · ${formatFeedDate(a.datetime, locale)}`}
              value={`${a.amountMm.toFixed(1)} ${t("gov", "mm")}`}
              valueClass={a.flashFloodRisk || a.veryHeavy ? "text-status-danger" : "text-status-warning"}
              label={a.flashFloodRisk ? t("gov", "warnFlashFlood") : warningPeriodLabel(a.periodType, locale)}
              labelClass={a.flashFloodRisk ? "text-status-danger" : undefined}
            />
          ),
        )}
      </ul>

      <div className="mt-3 flex flex-wrap gap-4">
        {sorted.length > WARNINGS_COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {showAll ? t("tmdWarning", "seeLess") : `${t("gov", "showAll")} (${sorted.length})`}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs font-medium text-accent hover:underline"
        >
          {showRaw ? t("gov", "viewSummary") : t("gov", "viewRaw")}
        </button>
      </div>
    </div>
  )
}

function ReservoirBody({ situation }: { situation: GovReservoirSituation }) {
  const { t, locale } = useLanguage()

  const dataDate = situation.date
    ? new Date(`${situation.date}T00:00:00`).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
        day: "numeric",
        month: "short",
      })
    : ""

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-status-danger">
          {t("gov", "reservoirOverCapacity")}: {situation.overCapacityCount}
        </span>
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-status-warning">
          {t("gov", "reservoirHigh")}: {situation.highCount}
        </span>
        <span className="glass-panel-strong px-3 py-1.5 text-xs font-medium text-ink-soft">
          {t("gov", "reservoirTotal")}: {situation.totalReservoirs}
        </span>
      </div>

      {dataDate && (
        <p className="mb-2 text-xs text-ink-soft">
          {t("gov", "reservoirDataDate")} {dataDate} · {t("gov", "reservoirTop")}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {situation.top.map((r) => {
          const over = r.percentStorage > RESERVOIR_OVER_PERCENT
          const high = r.percentStorage >= RESERVOIR_HIGH_PERCENT
          return (
            <DataRow
              key={r.id}
              marker={
                <Droplets className={`h-4 w-4 ${over ? "text-status-danger" : high ? "text-status-warning" : "text-accent"}`} />
              }
              title={r.name}
              subtitle={
                (locale === "th" ? r.region.th : r.region.en) +
                (r.inflow !== null ? ` · ${t("gov", "reservoirInflow")} ${r.inflow.toFixed(2)}` : "") +
                (r.outflow !== null ? ` · ${t("gov", "reservoirOutflow")} ${r.outflow.toFixed(2)}` : "")
              }
              value={`${r.percentStorage.toFixed(0)}%`}
              valueClass={over ? "text-status-danger" : high ? "text-status-warning" : "text-accent"}
              label={`${r.volume.toFixed(0)} / ${r.capacity.toFixed(0)} ${t("gov", "mcm")}`}
            />
          )
        })}
      </ul>
    </div>
  )
}

function SectionShell({
  id,
  icon,
  title,
  source,
  description,
  tone,
  children,
}: {
  /** Anchor for the overview tiles and the sticky section nav. */
  id: string
  icon: React.ReactNode
  title: string
  /** Owning agency, shown as a small caption — replaces the old big
   * per-agency group headers. */
  source: string
  description?: string
  /** Set when the section holds red-tier data right now — adds a pulsing
   * dot so a scan of the page mirrors the overview tiles. */
  tone?: "danger" | "warning"
  children: React.ReactNode
}) {
  return (
    // scroll-mt clears the sticky mobile top bar + section nav (lg has no
    // top bar, only the nav).
    <section id={id} className="glass-panel scroll-mt-40 p-5 lg:scroll-mt-20">
      <div className={description ? "mb-1.5 flex items-center gap-2" : "mb-4 flex items-center gap-2"}>
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
        {tone && (
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${tone === "danger" ? "bg-status-danger" : "bg-status-warning"}`}
          />
        )}
        <span className="ml-auto shrink-0 text-[10px] font-medium tracking-wide text-ink-soft">{source}</span>
      </div>
      {description && <p className="mb-4 text-xs leading-relaxed text-ink-soft">{description}</p>}
      {children}
    </section>
  )
}

/** One KPI tile in the overview strip. Stat-tile contract: sentence-case
 * label, semibold value (status-colored, but never color alone — the icon
 * and label carry the meaning too). Tapping jumps to the backing section. */
function OverviewTile({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  tone: "danger" | "warning" | "normal"
  onClick: () => void
}) {
  const valueClass =
    value === null
      ? "text-ink-soft"
      : tone === "danger"
        ? "text-status-danger"
        : tone === "warning"
          ? "text-status-warning"
          : "text-status-normal"
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-panel glass-interactive flex flex-col items-start gap-1.5 p-4 text-left"
    >
      <span className="flex items-center gap-1.5 text-xs text-ink-soft">
        {icon}
        {label}
      </span>
      <span className={`text-2xl font-semibold leading-none ${valueClass}`}>{value ?? "–"}</span>
    </button>
  )
}

/** Section ids in on-page (mobile single-column) order — drives the sticky
 * nav chips, the scroll spy, and the overview tile jump targets. */
const NAV_SECTIONS = [
  { id: "sec-announcements", labelKey: "navAnnouncements" },
  { id: "sec-alerts", labelKey: "navAlerts" },
  { id: "sec-rain", labelKey: "navRain" },
  { id: "sec-rivers", labelKey: "navRivers" },
  { id: "sec-forecast", labelKey: "navForecast" },
  { id: "sec-dams", labelKey: "navDams" },
] as const

type SectionId = (typeof NAV_SECTIONS)[number]["id"]

function jumpToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export default function GovDataPage() {
  const { t, locale } = useLanguage()
  const { data, loading, error } = useGovData()

  // ── "Based on my location": GPS → nearest HII station → its province is
  // treated as the viewer's. Rainfall switches to a near-you list; river and
  // flood alerts filter to that province. TMD text and RID reservoirs stay
  // national — they have no useful per-province granularity. Location is
  // only resolved (and the GPS permission prompt shown) once toggled on. ──
  const [localMode, setLocalMode] = useState(false)
  const { location, status: geoStatus, retry: retryGeo } = useGeolocation(localMode)
  const { stations: nearbyStations, loading: nearbyLoading } = useNearbyGovStations(localMode ? location : null)
  const userProvince = localMode && nearbyStations.length > 0 ? nearbyStations[0].province : null
  const localActive = localMode && userProvince !== null
  // The nearby hook only trusts real GPS fixes — an IP-derived location can
  // point at the wrong province entirely, so treat it the same as "denied".
  const needsGps = localMode && geoStatus !== "resolving" && location?.source !== "gps"

  const emptyNote = (text: string) => <p className="py-4 text-center text-sm text-ink-soft">{text}</p>
  const sectionError = emptyNote(t("gov", "sectionError"))

  // ── Overview tiles: red-tier headline numbers, scoped like the sections
  // (near-me mode recomputes alerts/rivers/rain for the province; reservoirs
  // only exist at region level, so that tile stays national). null = feed
  // failed or still resolving → the tile shows "–". ──
  const scopedAlerts =
    data?.waterWarnings == null
      ? null
      : localActive
        ? data.waterWarnings.filter((a) => a.parsed && a.province === userProvince.th)
        : data.waterWarnings
  const flashFloodCount = scopedAlerts === null ? null : scopedAlerts.filter((a) => a.flashFloodRisk).length
  const overflowCount =
    data?.riverSituation == null
      ? null
      : localActive
        ? data.riverSituation.critical.filter(
            (s) => s.province.th === userProvince.th && s.situationLevel >= RIVER_OVERFLOW_LEVEL,
          ).length
        : data.riverSituation.overflowCount
  const maxRain = localActive
    ? nearbyStations.length > 0
      ? Math.max(...nearbyStations.map((s) => s.rain24h))
      : null
    : data?.rainfall == null
      ? null
      : (data.rainfall[0]?.rain24h ?? 0)
  const damsOverCount = data?.reservoirs == null ? null : data.reservoirs.overCapacityCount

  // ── Scroll spy for the sticky section nav. ──
  const [activeSection, setActiveSection] = useState<SectionId>(NAV_SECTIONS[0].id)
  useEffect(() => {
    if (loading || !data) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id as SectionId)
      },
      { rootMargin: "-25% 0px -65% 0px" },
    )
    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [loading, data])

  return (
    <main className="min-h-dvh pb-16">
      <Header />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <div className="glass-panel animate-fade-in-up p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="glass-panel-strong flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Landmark className="h-5 w-5 text-accent" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight">{t("gov", "title")}</h1>
                <p className="text-sm text-ink-soft">{t("gov", "subtitle")}</p>
              </div>
            </div>

            {/* Scope: nationwide vs. near-me (GPS). Segmented control instead
                of a toggle so both states are visible and labeled. */}
            <div className="glass-panel-strong flex shrink-0 items-center gap-0.5 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLocalMode(false)}
                aria-pressed={!localMode}
                className={cn(
                  "flex items-center gap-1.5 rounded-glass-sm px-2.5 py-1.5 transition-colors duration-200",
                  !localMode ? "bg-accent/10 text-accent" : "text-ink-soft hover:text-ink",
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                {t("gov", "scopeNationwide")}
              </button>
              <button
                type="button"
                onClick={() => setLocalMode(true)}
                aria-pressed={localMode}
                className={cn(
                  "flex items-center gap-1.5 rounded-glass-sm px-2.5 py-1.5 transition-colors duration-200",
                  localMode ? "bg-accent/10 text-accent" : "text-ink-soft hover:text-ink",
                )}
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {t("gov", "scopeNearMe")}
              </button>
            </div>
          </div>

          {localMode && (
            <div className="mt-3 text-xs">
              {needsGps ? (
                <span className="flex flex-wrap items-center gap-2 text-status-warning">
                  {t("gov", "nearbyNeedsGps")}
                  <button
                    type="button"
                    onClick={retryGeo}
                    className="glass-panel-strong glass-interactive px-2.5 py-1 font-medium"
                  >
                    {t("gov", "nearbyEnableGps")}
                  </button>
                </span>
              ) : localActive ? (
                <span className="flex items-center gap-1.5 text-accent">
                  <LocateFixed className="h-3.5 w-3.5" />
                  {t("gov", "localFilteredTo")} {locale === "th" ? `จ.${userProvince.th}` : userProvince.en}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  {t("location", "resolving")}
                </span>
              )}
            </div>
          )}

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="glass-panel h-20 animate-pulse" />
              <div className="glass-panel h-20 animate-pulse" />
              <div className="glass-panel h-20 animate-pulse" />
              <div className="glass-panel h-20 animate-pulse" />
            </div>
            <div className="glass-panel h-12 animate-pulse" />
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="glass-panel h-48 animate-pulse" />
                <div className="glass-panel h-72 animate-pulse" />
                <div className="glass-panel h-72 animate-pulse" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="glass-panel h-48 animate-pulse" />
                <div className="glass-panel h-72 animate-pulse" />
              </div>
            </div>
          </>
        ) : (
          data && (
            <>
              {/* ── Overview: the page's headline answer, one tile per
                  red-tier question. Tap a tile to jump to its section. ── */}
              <div className="animate-fade-in-up grid grid-cols-2 gap-3 sm:grid-cols-4">
                <OverviewTile
                  icon={<ShieldAlert className="h-3.5 w-3.5" />}
                  label={t("gov", "warnFlashFlood")}
                  value={flashFloodCount === null ? null : String(flashFloodCount)}
                  tone={flashFloodCount !== null && flashFloodCount > 0 ? "danger" : "normal"}
                  onClick={() => jumpToSection("sec-alerts")}
                />
                <OverviewTile
                  icon={<Waves className="h-3.5 w-3.5" />}
                  label={t("gov", "riverOverflow")}
                  value={overflowCount === null ? null : String(overflowCount)}
                  tone={overflowCount !== null && overflowCount > 0 ? "danger" : "normal"}
                  onClick={() => jumpToSection("sec-rivers")}
                />
                <OverviewTile
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  label={t("gov", "reservoirOverCapacity")}
                  value={damsOverCount === null ? null : String(damsOverCount)}
                  tone={damsOverCount !== null && damsOverCount > 0 ? "danger" : "normal"}
                  onClick={() => jumpToSection("sec-dams")}
                />
                <OverviewTile
                  icon={<CloudRain className="h-3.5 w-3.5" />}
                  label={t("gov", "overviewMaxRain")}
                  value={maxRain === null ? null : `${maxRain.toFixed(0)} ${t("gov", "mm")}`}
                  tone={maxRain !== null && maxRain > RAIN_VERY_HEAVY_MM ? "danger" : maxRain !== null && maxRain > RAIN_HEAVY_MM ? "warning" : "normal"}
                  onClick={() => jumpToSection("sec-rain")}
                />
              </div>

              {/* ── Sticky section nav: sticks below the mobile top bar
                  (lg has the sidebar instead, so it sticks near the top). ── */}
              <nav className="sticky top-24 z-30 lg:top-4">
                <div className="glass-panel flex gap-1 overflow-x-auto p-1.5">
                  {NAV_SECTIONS.map(({ id, labelKey }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveSection(id)
                        jumpToSection(id)
                      }}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-glass-sm px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                        activeSection === id ? "glass-panel-strong text-accent" : "text-ink-soft hover:text-ink",
                      )}
                    >
                      {t("gov", labelKey)}
                    </button>
                  ))}
                </div>
              </nav>

              {/* ── Topic-first, urgency-ordered sections. lg+: warnings and
                  station lists in the main column, reading material
                  (forecast, reservoirs) in the side column. ── */}
              <div className="grid items-start gap-4 lg:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
                  <div className="animate-fade-in-up delay-75">
                    <SectionShell
                      id="sec-announcements"
                      source="TMD"
                      icon={<Megaphone className="h-4 w-4 text-accent" />}
                      title={t("gov", "announcementsTitle")}
                      description={t("gov", "announcementsDesc")}
                      tone={data.announcements && data.announcements.length > 0 ? "warning" : undefined}
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
                    <SectionShell
                      id="sec-alerts"
                      source="HII"
                      icon={<ShieldAlert className="h-4 w-4 text-status-warning" />}
                      title={t("gov", "warningsTitle")}
                      description={t("gov", "warningsDesc")}
                      tone={flashFloodCount !== null && flashFloodCount > 0 ? "danger" : undefined}
                    >
                      {data.waterWarnings === null ? (
                        sectionError
                      ) : data.waterWarnings.length === 0 ? (
                        emptyNote(t("gov", "noWarnings"))
                      ) : (
                        <WarningsBody alerts={data.waterWarnings} provinceFilter={localActive ? userProvince.th : undefined} />
                      )}
                    </SectionShell>
                  </div>

                  <div className="animate-fade-in-up delay-150">
                    <SectionShell
                      id="sec-rain"
                      source="HII"
                      icon={<CloudRain className="h-4 w-4 text-accent" />}
                      title={localActive ? t("gov", "nearbyTitle") : t("gov", "rainfallTitle")}
                      description={t("gov", "rainfallDesc")}
                      tone={maxRain !== null && maxRain > RAIN_VERY_HEAVY_MM ? "danger" : undefined}
                    >
                    {localActive ? (
                      nearbyLoading && nearbyStations.length === 0 ? (
                        emptyNote(t("common", "loading"))
                      ) : nearbyStations.length === 0 ? (
                        emptyNote(t("status", "noData"))
                      ) : (
                        <ol className="flex flex-col gap-2">
                          {nearbyStations.map((s, i) => {
                            const veryHeavy = s.rain24h > RAIN_VERY_HEAVY_MM
                            const heavy = s.rain24h > RAIN_HEAVY_MM
                            return (
                              <DataRow
                                key={`${s.stationName}-${i}`}
                                marker={<span className="text-xs font-semibold text-ink-soft">{i + 1}</span>}
                                title={`${t("gov", "rainfallStation")}${s.stationName ? ` ${s.stationName}` : ""}`}
                                subtitle={locale === "th" ? `${s.amphoe.th} · ${s.province.th}` : `${s.amphoe.en} · ${s.province.en}`}
                                value={`${s.rain24h.toFixed(1)} ${t("gov", "mm")}`}
                                valueClass={veryHeavy ? "text-status-danger" : heavy ? "text-status-warning" : "text-accent"}
                                label={`${s.distanceKm.toFixed(1)} ${t("gov", "kmAway")}`}
                              />
                            )
                          })}
                        </ol>
                      )
                    ) : data.rainfall === null ? (
                      sectionError
                    ) : data.rainfall.length === 0 ? (
                      emptyNote(t("status", "noData"))
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {data.rainfall.map((s, i) => {
                          const veryHeavy = s.rain24h > RAIN_VERY_HEAVY_MM
                          const heavy = s.rain24h > RAIN_HEAVY_MM
                          return (
                            <DataRow
                              key={`${s.stationName}-${i}`}
                              marker={<span className="text-xs font-semibold text-ink-soft">{i + 1}</span>}
                              title={`${t("gov", "rainfallStation")}${s.stationName ? ` ${s.stationName}` : ""}`}
                              subtitle={
                                locale === "th"
                                  ? `${s.amphoe.th} · ${s.province.th}${s.agency.th ? ` · ${s.agency.th}` : ""}`
                                  : `${s.amphoe.en} · ${s.province.en}${s.agency.en ? ` · ${s.agency.en}` : ""}`
                              }
                              value={`${s.rain24h.toFixed(1)} ${t("gov", "mm")}`}
                              valueClass={veryHeavy ? "text-status-danger" : heavy ? "text-status-warning" : "text-accent"}
                              label={heavy ? (veryHeavy ? t("gov", "rainVeryHeavy") : t("gov", "rainHeavy")) : undefined}
                              labelClass={veryHeavy ? "text-status-danger" : "text-status-warning"}
                            />
                          )
                        })}
                      </ol>
                    )}
                  </SectionShell>
                </div>

                  <div className="animate-fade-in-up delay-200">
                    <SectionShell
                      id="sec-rivers"
                      source="HII"
                      icon={<Waves className="h-4 w-4 text-accent" />}
                      title={t("gov", "riverTitle")}
                      description={t("gov", "riverDesc")}
                      tone={overflowCount !== null && overflowCount > 0 ? "danger" : undefined}
                    >
                      {data.riverSituation === null ? (
                        sectionError
                      ) : (
                        <RiverBody situation={data.riverSituation} provinceFilter={localActive ? userProvince.th : undefined} />
                      )}
                    </SectionShell>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                  <div className="animate-fade-in-up delay-100">
                    <SectionShell
                      id="sec-forecast"
                      source="TMD"
                      icon={<CloudSun className="h-4 w-4 text-accent" />}
                      title={t("gov", "forecastTitle")}
                      description={t("gov", "forecastDesc")}
                    >
                      {data.forecast === null ? sectionError : <ForecastBody forecast={data.forecast} />}
                    </SectionShell>
                  </div>

                  <div className="animate-fade-in-up delay-200">
                    <SectionShell
                      id="sec-dams"
                      source="RID"
                      icon={<Droplets className="h-4 w-4 text-accent" />}
                      title={t("gov", "reservoirTitle")}
                      description={t("gov", "reservoirDesc")}
                      tone={damsOverCount !== null && damsOverCount > 0 ? "danger" : undefined}
                    >
                      {data.reservoirs === null ? sectionError : <ReservoirBody situation={data.reservoirs} />}
                    </SectionShell>
                  </div>
                </div>
              </div>
            </>
          )
        )}
      </div>

      <SiteFooter />
    </main>
  )
}
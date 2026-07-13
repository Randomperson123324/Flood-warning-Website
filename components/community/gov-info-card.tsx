"use client"

import { Clock, CloudRain, CloudSun, Droplets, LoaderCircle, Megaphone, ShieldAlert, Waves, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { ReactionBar } from "@/components/community/reaction-bar"
import { RAIN_HEAVY_MM, RAIN_VERY_HEAVY_MM, RIVER_OVERFLOW_LEVEL } from "@/lib/gov/thaiwater"
import { RESERVOIR_HIGH_PERCENT, RESERVOIR_OVER_PERCENT } from "@/lib/gov/rid-reservoir"
import { cn } from "@/lib/utils"
import type { dictionary } from "@/lib/i18n/dictionaries"
import type { GovDataPayload } from "@/app/api/gov/route"
import type { GovCommandKind } from "@/types"
import type { ReactionSummary } from "@/hooks/use-message-reactions"

/** Shared registry for the gov `/` commands — the chat composer menu and the
 * persisted cards both key off this, so tokens/icons/titles stay in sync. */
export const GOV_COMMANDS: Record<
  GovCommandKind,
  { token: string; icon: typeof Megaphone; titleKey: keyof (typeof dictionary)["gov"] }
> = {
  tmdwarning: { token: "/tmdwarning", icon: Megaphone, titleKey: "announcementsTitle" },
  tmdforecast: { token: "/tmdforecast", icon: CloudSun, titleKey: "forecastTitle" },
  rainfall: { token: "/rainfall", icon: CloudRain, titleKey: "rainfallTitle" },
  river: { token: "/river", icon: Waves, titleKey: "riverTitle" },
  floodalert: { token: "/floodalert", icon: ShieldAlert, titleKey: "warningsTitle" },
  reservoir: { token: "/reservoir", icon: Droplets, titleKey: "reservoirTitle" },
}

/** Which GovDataPayload field each command's card reads — used to snapshot
 * exactly that section into `messages.gov_payload` at post time. */
export const GOV_KIND_TO_FIELD: Record<GovCommandKind, keyof Omit<GovDataPayload, "timestamp">> = {
  tmdwarning: "announcements",
  tmdforecast: "forecast",
  rainfall: "rainfall",
  river: "riverSituation",
  floodalert: "waterWarnings",
  reservoir: "reservoirs",
}

/** All-sections-failed payload — spread a snapshot's section over it to
 * render a persisted card without any live data. */
export const EMPTY_GOV_PAYLOAD: GovDataPayload = {
  announcements: null,
  forecast: null,
  waterWarnings: null,
  riverSituation: null,
  rainfall: null,
  reservoirs: null,
  timestamp: "",
}

/** How many list rows a chat card shows — cards are conversation inserts,
 * not the full /gov-data page, so keep them glanceable. */
const CARD_MAX_ROWS = 4

interface GovInfoCardProps {
  kind: GovCommandKind
  /** Shared payload from the panel-level useGovData() — cards never fetch. */
  data: GovDataPayload | null
  /** True when `data` is the snapshot persisted with the message — shows
   * the "data as of when this was sent" footnote. */
  snapshot?: boolean
  username?: string
  time?: string
  isMine?: boolean
  onDismiss?: () => void
  reactions?: ReactionSummary[]
  onToggleReaction?: (reactionType: string) => void
}

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

function Chip({ tone, children }: { tone: "danger" | "warning" | "soft"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "glass-panel-strong px-2.5 py-1 text-xs font-medium",
        tone === "danger" && "text-status-danger",
        tone === "warning" && "text-status-warning",
        tone === "soft" && "text-ink-soft",
      )}
    >
      {children}
    </span>
  )
}

function CompactRow({
  icon,
  title,
  subtitle,
  value,
  valueClass,
  label,
  labelClass,
}: {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  value: string
  valueClass: string
  label?: string
  labelClass?: string
}) {
  return (
    <li className="glass-panel-strong flex items-center gap-2.5 p-2.5">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold", valueClass)}>{value}</p>
        {label && <p className={cn("text-[10px] font-medium", labelClass ?? "text-ink-soft")}>{label}</p>}
      </div>
    </li>
  )
}

function CardBody({ kind, data }: { kind: GovCommandKind; data: GovDataPayload }) {
  const { t, locale } = useLanguage()
  const sectionError = <p className="py-3 text-center text-sm text-ink-soft">{t("gov", "sectionError")}</p>

  if (kind === "tmdwarning") {
    if (data.announcements === null) return sectionError
    if (data.announcements.length === 0)
      return <p className="py-3 text-center text-sm text-ink-soft">{t("gov", "noAnnouncements")}</p>
    return (
      <ul className="flex flex-col gap-2">
        {data.announcements.slice(0, CARD_MAX_ROWS).map((a, i) => {
          const pick = (th: string, en: string) => (locale === "en" && en ? en : th)
          return (
            <li key={i} className="glass-panel-strong flex flex-col gap-1 p-2.5">
              <p className="text-sm font-medium leading-snug">{pick(a.titleThai, a.titleEnglish)}</p>
              {a.announceDate && (
                <p className="text-xs text-ink-soft">
                  {t("gov", "issued")} {formatFeedDate(a.announceDate, locale)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  if (kind === "tmdforecast") {
    if (data.forecast === null) return sectionError
    const overall = locale === "en" && data.forecast.overall.en ? data.forecast.overall.en : data.forecast.overall.th
    return (
      <div>
        {data.forecast.issuedText && <p className="mb-1.5 text-xs text-ink-soft">{data.forecast.issuedText}</p>}
        <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed">{overall}</p>
      </div>
    )
  }

  if (kind === "rainfall") {
    if (data.rainfall === null) return sectionError
    if (data.rainfall.length === 0) return <p className="py-3 text-center text-sm text-ink-soft">{t("status", "noData")}</p>
    return (
      <ol className="flex flex-col gap-2">
        {data.rainfall.slice(0, CARD_MAX_ROWS).map((s, i) => {
          const veryHeavy = s.rain24h > RAIN_VERY_HEAVY_MM
          const heavy = s.rain24h > RAIN_HEAVY_MM
          return (
            <CompactRow
              key={`${s.stationName}-${i}`}
              icon={<span className="w-4 shrink-0 text-center text-xs font-semibold text-ink-soft">{i + 1}</span>}
              title={s.stationName || t("gov", "rainfallStation")}
              subtitle={locale === "th" ? `${s.amphoe.th} · ${s.province.th}` : `${s.amphoe.en} · ${s.province.en}`}
              value={`${s.rain24h.toFixed(1)} ${t("gov", "mm")}`}
              valueClass={veryHeavy ? "text-status-danger" : heavy ? "text-status-warning" : "text-accent"}
              label={veryHeavy ? t("gov", "rainVeryHeavy") : heavy ? t("gov", "rainHeavy") : undefined}
              labelClass={veryHeavy ? "text-status-danger" : "text-status-warning"}
            />
          )
        })}
      </ol>
    )
  }

  if (kind === "river") {
    if (data.riverSituation === null) return sectionError
    const s = data.riverSituation
    return (
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Chip tone="danger">
            {t("gov", "riverOverflow")}: {s.overflowCount}
          </Chip>
          <Chip tone="warning">
            {t("gov", "riverHigh")}: {s.highCount}
          </Chip>
          <Chip tone="soft">
            {t("gov", "riverStationsTotal")}: {s.totalStations}
          </Chip>
        </div>
        {s.critical.length === 0 ? (
          <p className="py-2 text-center text-sm text-status-normal">{t("gov", "riverAllNormal")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {s.critical.slice(0, CARD_MAX_ROWS).map((st, i) => {
              const overflowing = st.situationLevel >= RIVER_OVERFLOW_LEVEL
              return (
                <CompactRow
                  key={`${st.stationName}-${i}`}
                  icon={<Waves className={cn("h-4 w-4 shrink-0", overflowing ? "text-status-danger" : "text-status-warning")} />}
                  title={st.stationName}
                  subtitle={[st.river, locale === "th" ? st.province.th : st.province.en].filter(Boolean).join(" · ")}
                  value={overflowing ? t("gov", "riverOverflow") : t("gov", "riverHigh")}
                  valueClass={overflowing ? "text-status-danger" : "text-status-warning"}
                  label={st.storagePercent !== null ? `${st.storagePercent.toFixed(0)}% ${t("gov", "riverBank")}` : undefined}
                />
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  if (kind === "floodalert") {
    if (data.waterWarnings === null) return sectionError
    if (data.waterWarnings.length === 0)
      return <p className="py-3 text-center text-sm text-ink-soft">{t("gov", "noWarnings")}</p>
    const alerts = [...data.waterWarnings].sort(
      (a, b) => Number(b.flashFloodRisk) - Number(a.flashFloodRisk) || Number(b.veryHeavy) - Number(a.veryHeavy),
    )
    const flashFloodCount = alerts.filter((a) => a.flashFloodRisk).length
    return (
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Chip tone="danger">
            {t("gov", "warnFlashFlood")}: {flashFloodCount}
          </Chip>
          <Chip tone="soft">
            {t("gov", "warnTotal")}: {alerts.length}
          </Chip>
        </div>
        <ul className="flex flex-col gap-2">
          {alerts.slice(0, CARD_MAX_ROWS).map((a, i) =>
            !a.parsed ? (
              <li key={i} className="glass-panel-strong p-2.5">
                <p className="line-clamp-3 text-sm leading-relaxed">{a.raw}</p>
              </li>
            ) : (
              <CompactRow
                key={i}
                icon={
                  a.flashFloodRisk ? (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-status-danger" />
                  ) : (
                    <CloudRain className={cn("h-4 w-4 shrink-0", a.veryHeavy ? "text-status-danger" : "text-status-warning")} />
                  )
                }
                title={a.station}
                subtitle={`จ.${a.province} · ${formatFeedDate(a.datetime, locale)}`}
                value={`${a.amountMm.toFixed(1)} ${t("gov", "mm")}`}
                valueClass={a.flashFloodRisk || a.veryHeavy ? "text-status-danger" : "text-status-warning"}
                label={a.flashFloodRisk ? t("gov", "warnFlashFlood") : undefined}
                labelClass="text-status-danger"
              />
            ),
          )}
        </ul>
      </div>
    )
  }

  // reservoir
  if (data.reservoirs === null) return sectionError
  const r = data.reservoirs
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Chip tone="danger">
          {t("gov", "reservoirOverCapacity")}: {r.overCapacityCount}
        </Chip>
        <Chip tone="warning">
          {t("gov", "reservoirHigh")}: {r.highCount}
        </Chip>
        <Chip tone="soft">
          {t("gov", "reservoirTotal")}: {r.totalReservoirs}
        </Chip>
      </div>
      <ul className="flex flex-col gap-2">
        {r.top.slice(0, CARD_MAX_ROWS).map((res) => {
          const over = res.percentStorage > RESERVOIR_OVER_PERCENT
          const high = res.percentStorage >= RESERVOIR_HIGH_PERCENT
          return (
            <CompactRow
              key={res.id}
              icon={<Droplets className={cn("h-4 w-4 shrink-0", over ? "text-status-danger" : high ? "text-status-warning" : "text-accent")} />}
              title={res.name}
              subtitle={locale === "th" ? res.region.th : res.region.en}
              value={`${res.percentStorage.toFixed(0)}%`}
              valueClass={over ? "text-status-danger" : high ? "text-status-warning" : "text-accent"}
              label={`${res.volume.toFixed(0)} / ${res.capacity.toFixed(0)} ${t("gov", "mcm")}`}
            />
          )
        })}
      </ul>
    </div>
  )
}

/** Read-only Government Data Center card summoned by the gov `/` chat
 * commands — same inline-card pattern as `/sensor`. `data` is normally the
 * snapshot persisted with the message (figures from when the command was
 * typed); legacy snapshot-less cards get the panel-level live payload. */
export function GovInfoCard({ kind, data, snapshot, username, time, isMine, onDismiss, reactions, onToggleReaction }: GovInfoCardProps) {
  const { t } = useLanguage()
  const { token, icon: Icon, titleKey } = GOV_COMMANDS[kind]

  return (
    <div className={cn("group flex animate-fade-in-up flex-col gap-1", isMine ? "items-end" : "items-start")}>
      <div className="flex items-baseline gap-1.5 px-1 text-xs text-ink-soft">
        <Icon className="h-3.5 w-3.5 shrink-0 self-center text-accent" />
        <span className="font-medium text-accent">{token}</span>
        {username && (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-ink">{username}</span>
          </>
        )}
        {time && <span>{time}</span>}
      </div>

      <div className="glass-panel-strong relative flex w-full max-w-md flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{t("gov", titleKey)}</h3>
          {onDismiss && (
            <button type="button" onClick={onDismiss} aria-label={t("sensor", "close")} className="glass-interactive -m-1 rounded-full p-1 text-ink-soft">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {data === null ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-ink-soft">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            {t("common", "loading")}
          </div>
        ) : (
          <CardBody kind={kind} data={data} />
        )}

        {snapshot && (
          <div className="flex items-center gap-1.5 border-t border-border/10 pt-2.5 text-xs text-ink-soft">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("gov", "snapshotNote")}
              {time ? ` · ${time}` : ""}
            </span>
          </div>
        )}
      </div>

      {onToggleReaction && (
        <ReactionBar reactions={reactions ?? []} onToggleReaction={onToggleReaction} align={isMine ? "end" : "start"} />
      )}
    </div>
  )
}

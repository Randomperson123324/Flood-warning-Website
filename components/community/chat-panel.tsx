"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Send, X, ArrowDown, Gauge, Bot, LoaderCircle, LocateFixed, Search, TrendingUp } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { useCommunityChat } from "@/hooks/use-community-chat"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useGovData } from "@/hooks/use-gov-data"
import { useSensors } from "@/hooks/use-sensors"
import { useLatestReadings } from "@/hooks/use-latest-readings"
import { useWaterData } from "@/hooks/use-water-data"
import { useWeatherData } from "@/hooks/use-weather-data"
import { useFloodReports } from "@/hooks/use-flood-reports"
import { useAIChat } from "@/hooks/use-ai-chat"
import { computeSeverity } from "@/lib/water-analysis"
import { SITE_CONFIG } from "@/lib/config"
import { cn } from "@/lib/utils"
import { MessageItem } from "@/components/community/message-item"
import { ChatCommandMenu } from "@/components/community/chat-command-menu"
import { SensorInfoCard } from "@/components/community/sensor-info-card"
import { GovInfoCard, GOV_COMMANDS, GOV_KIND_TO_FIELD, EMPTY_GOV_PAYLOAD, type GovCardPayload } from "@/components/community/gov-info-card"
import type { GovDataPayload } from "@/app/api/gov/route"
import { resolveViaGps } from "@/hooks/use-geolocation"
import { RIVER_HIGH_LEVEL, RIVER_OVERFLOW_LEVEL } from "@/lib/gov/thaiwater"
import type { GovNearbyStation, GovRainStation, GovRiverStation, GovWarningAlert } from "@/lib/gov/thaiwater"
import type { GovReservoir } from "@/lib/gov/rid-reservoir"
import { AIExchangeMessage, type AIExchange } from "@/components/community/ai-exchange-message"
import { EngineSettings } from "@/components/ai-assistant/engine-settings"
import type { AIContext, ChatMessage, GovCommandKind, Sensor, WarningSeverity } from "@/types"

const SEVERITY_DOT_CLASS: Record<WarningSeverity, string> = {
  normal: "bg-status-normal",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
}

// Fallback so useAIChat always has a context object to hook onto, even
// before the community-wide "recommended sensor" has loaded.
const EMPTY_AI_CONTEXT: AIContext = {
  sensorLabel: "",
  currentLevel: 0,
  warningLevel: 0,
  dangerLevel: 0,
  trend: "stable",
  ratePerHour: 0,
  activeFloodReports: 0,
}

type SlashCommand = { token: string; key: "sensor" | "ai" | GovCommandKind }

const GOV_KINDS = Object.keys(GOV_COMMANDS) as GovCommandKind[]

/** Gov commands with a scope menu (highest / near me / search). /tmdwarning
 * is national text with nothing to scope — it posts directly. */
const GOV_SCOPED_KINDS = GOV_KINDS.filter((kind) => kind !== "tmdwarning")

const SLASH_COMMANDS: SlashCommand[] = [
  { token: "/sensor", key: "sensor" },
  { token: "/AI", key: "ai" },
  ...GOV_KINDS.map((kind) => ({ token: GOV_COMMANDS[kind].token, key: kind })),
]

type SlashState =
  | { type: "menu"; matches: SlashCommand[] }
  | { type: "sensor"; query: string }
  | { type: "ai"; question: string }
  | { type: "gov"; kind: GovCommandKind; query: string; search: boolean }
  | null

function parseSlash(draft: string): SlashState {
  if (!draft.startsWith("/")) return null
  const spaceIdx = draft.indexOf(" ")
  const cmdRaw = spaceIdx === -1 ? draft.slice(1) : draft.slice(1, spaceIdx)
  const cmd = cmdRaw.toLowerCase()
  const rest = spaceIdx === -1 ? "" : draft.slice(spaceIdx + 1)

  // "/rainfallsearch" etc. — the dedicated search form the "Search by name…"
  // menu option fills in. Recognized with or without a trailing space so the
  // menu doesn't collapse mid-typing.
  const searchKind = GOV_SCOPED_KINDS.find((kind) => `${kind}search` === cmd)
  if (searchKind) return { type: "gov", kind: searchKind, query: rest, search: true }

  if (spaceIdx === -1) {
    const matches = SLASH_COMMANDS.filter((c) => c.token.slice(1).toLowerCase().startsWith(cmd))
    return matches.length > 0 ? { type: "menu", matches } : null
  }

  if (cmd === "sensor") return { type: "sensor", query: rest }
  if (cmd === "ai") return { type: "ai", question: rest }
  // Gov commands open a scope menu: highest / near me / search by name.
  const govKind = GOV_SCOPED_KINDS.find((kind) => kind === cmd)
  if (govKind) return { type: "gov", kind: govKind, query: rest, search: false }
  return null
}

/** A result row from /api/gov/search — shape depends on the command. */
type GovSearchResult = GovRainStation | GovRiverStation | GovWarningAlert | GovReservoir

type MenuItem =
  | { kind: "command"; command: SlashCommand }
  | { kind: "sensor"; sensor: Sensor }
  | { kind: "govopt"; govKind: GovCommandKind; opt: "highest" | "local" | "search" }
  | { kind: "govresult"; govKind: GovCommandKind; item: GovSearchResult }

/** Display strings for a search-result menu row (also used as its key). */
function govResultDisplay(govKind: GovCommandKind, item: GovSearchResult, locale: string): { title: string; sub: string; value: string } {
  if (govKind === "reservoir") {
    const r = item as GovReservoir
    return { title: r.name, sub: locale === "th" ? r.region.th : r.region.en, value: `${r.percentStorage.toFixed(0)}%` }
  }
  if (govKind === "river") {
    const s = item as GovRiverStation
    return {
      title: s.stationName,
      sub: [s.river, locale === "th" ? s.province.th : s.province.en].filter(Boolean).join(" · "),
      value: s.storagePercent !== null ? `${s.storagePercent.toFixed(0)}%` : "",
    }
  }
  if (govKind === "floodalert") {
    const a = item as GovWarningAlert
    return { title: a.station, sub: `จ.${a.province}`, value: `${a.amountMm.toFixed(1)} mm` }
  }
  const s = item as GovRainStation
  return {
    title: s.stationName,
    sub: locale === "th" ? `${s.amphoe.th} · ${s.province.th}` : `${s.amphoe.en} · ${s.province.en}`,
    value: `${s.rain24h.toFixed(1)} mm`,
  }
}

function CommandMenuRow({ command }: { command: SlashCommand }) {
  const { t } = useLanguage()
  const Icon = command.key === "sensor" ? Gauge : command.key === "ai" ? Bot : GOV_COMMANDS[command.key].icon
  const desc =
    command.key === "sensor"
      ? t("community", "commandSensorDesc")
      : command.key === "ai"
        ? t("community", "commandAiDesc")
        : t("gov", GOV_COMMANDS[command.key].titleKey)
  return (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex flex-col">
        <span className="font-mono font-medium">{command.token}</span>
        <span className="text-xs text-ink-soft">{desc}</span>
      </span>
    </>
  )
}

export function ChatPanel() {
  const { t, locale } = useLanguage()
  const { user, profile } = useAuth()
  const { messages, loading, sendMessage, sendAIExchange, sendSensorCard, sendGovCard } = useCommunityChat()
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])
  const { byMessage, toggleReaction } = useMessageReactions(messageIds)

  // ── Gov commands: cards render the snapshot persisted with the message
  // (data from when the command was typed). The live feed is only fetched
  // for legacy snapshot-less cards, and the server route caches upstream
  // agency responses, so gov commands never hammer TMD/HII/RID. ──
  const hasLegacyGovCards = useMemo(() => messages.some((m) => m.type === "gov" && m.gov_payload == null), [messages])
  const { data: govData } = useGovData(hasLegacyGovCards)

  // Snapshot source for a NEW gov card: reuse the already-loaded payload if
  // there is one, otherwise a one-off request (cheap — served from the
  // route's 15-min upstream cache, not from the agencies).
  async function getGovPayload(): Promise<GovDataPayload | null> {
    if (govData) return govData
    try {
      const res = await fetch("/api/gov", { cache: "no-store" })
      return res.ok ? ((await res.json()) as GovDataPayload) : null
    } catch {
      return null
    }
  }

  async function postGovHighest(kind: GovCommandKind) {
    const payload = await getGovPayload()
    const wrapper: GovCardPayload = { mode: "highest", data: payload ? payload[GOV_KIND_TO_FIELD[kind]] : null }
    await sendGovCard(kind, wrapper)
  }

  /** "Based on my location": GPS → nearest stations → sender's province.
   * Rainfall snapshots the near-you list itself; river/flood alerts snapshot
   * the nationwide data filtered to that province. */
  async function postGovLocal(kind: GovCommandKind) {
    let lat: number, lon: number
    try {
      const loc = await resolveViaGps()
      lat = loc.lat
      lon = loc.lon
    } catch {
      showNotice(t("gov", "nearbyNeedsGps"))
      return
    }

    let stations: GovNearbyStation[] = []
    try {
      const res = await fetch(`/api/gov/nearby?lat=${lat}&lon=${lon}`, { cache: "no-store" })
      if (res.ok) stations = ((await res.json()).stations ?? []) as GovNearbyStation[]
    } catch {
      // fall through with no stations — the card will show its empty state
    }
    const province = stations[0]?.province

    let data: unknown
    if (kind === "rainfall") {
      data = stations
    } else {
      const payload = await getGovPayload()
      if (kind === "river") {
        const situation = payload?.riverSituation
        const critical = situation && province ? situation.critical.filter((s) => s.province.th === province.th) : []
        data = situation
          ? {
              totalStations: critical.length,
              overflowCount: critical.filter((s) => s.situationLevel >= RIVER_OVERFLOW_LEVEL).length,
              highCount: critical.filter((s) => s.situationLevel === RIVER_HIGH_LEVEL).length,
              critical,
            }
          : null
      } else {
        const alerts = payload?.waterWarnings
        data = alerts ? (province ? alerts.filter((a) => a.parsed && a.province === province.th) : []) : null
      }
    }

    const wrapper: GovCardPayload = { mode: "local", label: province, data }
    await sendGovCard(kind, wrapper)
  }

  /** A single station/reservoir/alert picked from the name-search menu. */
  async function postGovSearch(kind: GovCommandKind, item: GovSearchResult) {
    let data: unknown
    if (kind === "river") data = { totalStations: 0, overflowCount: 0, highCount: 0, critical: [item] }
    else if (kind === "reservoir") data = { date: "", totalReservoirs: 0, overCapacityCount: 0, highCount: 0, top: [item] }
    else data = [item]
    const wrapper: GovCardPayload = { mode: "search", data }
    await sendGovCard(kind, wrapper)
  }

  // ── /sensor: live sensor directory for autocomplete + inline info cards ──
  const { sensors, recommendedSensor } = useSensors(null)
  const sensorIds = useMemo(() => sensors.map((s) => s.sensor_id), [sensors])
  const latestBySensorId = useLatestReadings(sensorIds)
  // Cards the viewer has locally hidden — client-side only, doesn't touch
  // the shared persisted message so it doesn't disappear for anyone else.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  // ── /AI: reuse the same assistant plumbing as the floating panel ──
  const water = useWaterData(recommendedSensor)
  const weather = useWeatherData(recommendedSensor)
  const { reports } = useFloodReports()
  const aiContext = useMemo<AIContext>(() => {
    if (!recommendedSensor) return EMPTY_AI_CONTEXT
    return {
      currentLevel: water.latest?.level ?? 0,
      warningLevel: recommendedSensor.warning_level_cm,
      dangerLevel: recommendedSensor.danger_level_cm,
      trend: water.trend,
      ratePerHour: water.ratePerHour,
      weather: weather.weather,
      activeFloodReports: reports.length,
      sensorLabel: recommendedSensor.label,
      sensorId: recommendedSensor.sensor_id,
      sensorLat: recommendedSensor.lat,
      sensorLon: recommendedSensor.lon,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendedSensor, water.latest?.level, water.trend, water.ratePerHour, weather.weather, reports.length])
  // `false` keeps the periodic auto-analysis polling (a floating-panel-only
  // feature) from ever running here — we only want sendMessage().
  const { chatHistory: aiChatHistory, isSending: isSendingAI, sendMessage: sendAIMessage, clearHistory: clearAIHistory } = useAIChat(
    aiContext,
    false,
  )

  // The in-flight `/AI` exchange, shown locally *while streaming*. As soon
  // as the stream finishes it gets persisted to Supabase and this local
  // copy is cleared — the persisted row (arriving via realtime) becomes
  // the one source of truth from then on, so it survives a refresh.
  const liveAIExchange = useMemo<AIExchange | null>(() => {
    if (!isSendingAI) return null
    const userMsg = aiChatHistory.at(-2)
    const asstMsg = aiChatHistory.at(-1)
    if (!userMsg || userMsg.role !== "user") return null
    return {
      id: "ai-live",
      question: userMsg.content,
      answer: asstMsg?.role === "assistant" ? asstMsg.content : "",
      isLoading: asstMsg?.isLoading ?? true,
      toolStatus: asstMsg?.toolStatus,
    }
  }, [aiChatHistory, isSendingAI])

  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(null), SITE_CONFIG.community.chatNoticeDurationMs)
  }
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const isInitialScroll = useRef(true)

  // ── Feed: persisted messages (text / /AI / /sensor) + the in-flight /AI bubble ──
  type FeedItem = { id: string; node: React.ReactNode }
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = []
    for (const message of messages) {
      if (hiddenIds.has(message.id)) continue

      if (message.type === "ai") {
        const exchange: AIExchange = {
          id: message.id,
          question: message.ai_question ?? message.content,
          answer: message.ai_answer ?? "",
          isLoading: false,
        }
        items.push({
          id: message.id,
          node: (
            <AIExchangeMessage
              exchange={exchange}
              username={message.users?.username}
              time={
                message.created_at
                  ? new Date(message.created_at).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" })
                  : undefined
              }
              isMine={message.user_id === user?.id}
              reactions={byMessage[message.id] ?? []}
              onToggleReaction={(type) => toggleReaction(message.id, type)}
            />
          ),
        })
        continue
      }

      if (message.type === "gov") {
        if (!message.gov_kind || !(message.gov_kind in GOV_COMMANDS)) continue
        // Snapshot from post time when present; legacy cards fall back to live
        // data. Newer snapshots wrap the section in { mode, label, data };
        // older ones stored the bare section (implicitly "highest").
        const raw = message.gov_payload
        const wrapped =
          raw !== null && typeof raw === "object" && !Array.isArray(raw) && "mode" in raw ? (raw as GovCardPayload) : null
        const section = wrapped ? wrapped.data : raw
        const cardData =
          raw != null
            ? ({ ...EMPTY_GOV_PAYLOAD, [GOV_KIND_TO_FIELD[message.gov_kind]]: section } as GovDataPayload)
            : govData
        items.push({
          id: message.id,
          node: (
            <GovInfoCard
              kind={message.gov_kind}
              data={cardData}
              snapshot={raw != null}
              mode={wrapped?.mode}
              label={wrapped?.label}
              username={message.users?.username}
              time={
                message.created_at
                  ? new Date(message.created_at).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" })
                  : undefined
              }
              isMine={message.user_id === user?.id}
              onDismiss={() => setHiddenIds((prev) => new Set(prev).add(message.id))}
              reactions={byMessage[message.id] ?? []}
              onToggleReaction={(type) => toggleReaction(message.id, type)}
            />
          ),
        })
        continue
      }

      if (message.type === "sensor") {
        const sensor = sensors.find((s) => s.sensor_id === message.sensor_id)
        if (!sensor) continue // sensor since removed/deactivated — skip rendering
        items.push({
          id: message.id,
          node: (
            <SensorInfoCard
              sensor={sensor}
              username={message.users?.username}
              time={
                message.created_at
                  ? new Date(message.created_at).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" })
                  : undefined
              }
              isMine={message.user_id === user?.id}
              onDismiss={() => setHiddenIds((prev) => new Set(prev).add(message.id))}
              reactions={byMessage[message.id] ?? []}
              onToggleReaction={(type) => toggleReaction(message.id, type)}
            />
          ),
        })
        continue
      }

      items.push({
        id: message.id,
        node: (
          <MessageItem
            message={message}
            reactions={byMessage[message.id] ?? []}
            onReply={setReplyTo}
            onToggleReaction={toggleReaction}
          />
        ),
      })
    }

    if (liveAIExchange) {
      items.push({
        id: "ai-live",
        node: <AIExchangeMessage exchange={liveAIExchange} username={profile?.username} isMine />,
      })
    }

    return items
  }, [messages, byMessage, sensors, hiddenIds, liveAIExchange, govData, locale, user, profile])

  const slash = useMemo(() => parseSlash(draft), [draft])

  // ── Gov name search: debounced server-side lookup over the full cached
  // feeds (the client payload only carries top-N lists). ──
  const [govResults, setGovResults] = useState<GovSearchResult[]>([])
  const [govSearching, setGovSearching] = useState(false)
  const govSearchKind = slash?.type === "gov" ? slash.kind : null
  const govSearchQuery = slash?.type === "gov" ? slash.query.trim() : ""

  useEffect(() => {
    if (!govSearchKind || !govSearchQuery) {
      setGovResults([])
      setGovSearching(false)
      return
    }
    setGovSearching(true)
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gov/search?kind=${govSearchKind}&q=${encodeURIComponent(govSearchQuery)}`)
        const json = res.ok ? await res.json() : { results: [] }
        if (!cancelled) setGovResults(json.results ?? [])
      } catch {
        if (!cancelled) setGovResults([])
      } finally {
        if (!cancelled) setGovSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [govSearchKind, govSearchQuery])

  const menuItems = useMemo<MenuItem[]>(() => {
    if (slash?.type === "menu") return slash.matches.map((command) => ({ kind: "command" as const, command }))
    if (slash?.type === "sensor") {
      const q = slash.query.trim().toLowerCase()
      return sensors
        .filter((s) => !q || s.label.toLowerCase().includes(q) || s.sensor_id.toLowerCase().includes(q))
        .map((sensor) => ({ kind: "sensor" as const, sensor }))
    }
    if (slash?.type === "gov") {
      if (!slash.search && !slash.query.trim()) {
        const opts: MenuItem[] = [{ kind: "govopt", govKind: slash.kind, opt: "highest" }]
        // Reservoirs only have region granularity — "near me" would mislead.
        if (slash.kind !== "reservoir") opts.push({ kind: "govopt", govKind: slash.kind, opt: "local" })
        opts.push({ kind: "govopt", govKind: slash.kind, opt: "search" })
        return opts
      }
      return govResults.map((item) => ({ kind: "govresult" as const, govKind: slash.kind, item }))
    }
    return []
  }, [slash, sensors, govResults])

  const menuOpen = slash?.type === "menu" || slash?.type === "sensor" || slash?.type === "gov"
  const clampedIndex = menuItems.length > 0 ? Math.min(highlightedIndex, menuItems.length - 1) : 0

  useEffect(() => setHighlightedIndex(0), [draft])

  const scrollToBottom = (smooth = true) => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" })
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100
    setShowScrollBottom(isNotAtBottom)
  }

  useEffect(() => {
    scrollToBottom(!isInitialScroll.current)
    if (feed.length > 0) {
      isInitialScroll.current = false
    }
  }, [feed.length])

  async function selectMenuItem(item: MenuItem) {
    if (item.kind === "command") {
      if (item.command.key === "tmdwarning") {
        // National announcements have no scope to pick — post directly.
        setDraft("")
        await postGovHighest("tmdwarning")
        return
      }
      // Every other command takes a second step — /sensor and scoped gov
      // commands open their menus, /AI awaits a question.
      setDraft(`${item.command.token} `)
      inputRef.current?.focus()
    } else if (item.kind === "govopt") {
      if (item.opt === "search") {
        // Not a posting action — switch to the dedicated search command and
        // hand focus back so they type the name.
        setDraft(`${GOV_COMMANDS[item.govKind].token}search `)
        inputRef.current?.focus()
        return
      }
      setDraft("")
      if (item.opt === "highest") await postGovHighest(item.govKind)
      else await postGovLocal(item.govKind)
    } else if (item.kind === "govresult") {
      setDraft("")
      await postGovSearch(item.govKind, item.item)
    } else {
      setDraft("")
      await sendSensorCard(item.sensor)
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!menuOpen || menuItems.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % menuItems.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((i) => (i - 1 + menuItems.length) % menuItems.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      selectMenuItem(menuItems[clampedIndex])
    } else if (e.key === "Escape") {
      setDraft("")
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return

    if (slash?.type === "ai") {
      const question = slash.question.trim()
      if (!question) return
      setDraft("")
      sendAIMessage(question, async (finalText) => {
        await sendAIExchange({ question, answer: finalText })
        clearAIHistory()
      })
      return
    }

    if (slash?.type === "gov" || slash?.type === "sensor" || slash?.type === "menu") {
      // Incomplete command — require an explicit pick from the dropdown.
      return
    }

    const { error } = await sendMessage({ content: draft, replyTo })
    if (error === "RATE_LIMITED") {
      setNotice(t("community", "rateLimited"))
      setTimeout(() => setNotice(null), SITE_CONFIG.community.chatNoticeDurationMs)
      return
    }
    setDraft("")
    setReplyTo(null)
  }

  const placeholder =
    slash?.type === "ai"
      ? t("community", "askAiPlaceholder")
      : slash?.type === "sensor"
        ? t("community", "commandSearchPlaceholder")
        : slash?.type === "gov"
          ? t("community", "govSearchPlaceholder")
          : t("community", "placeholder")

  return (
    <div className="glass-panel flex h-[clamp(24rem,70vh,42rem)] flex-col overflow-hidden">
      <div className="relative flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex-1 min-h-0" />
          {!loading && feed.length === 0 && <p className="py-8 text-center text-sm text-ink-soft">{t("community", "empty")}</p>}

          {feed.map((item) => (
            <div key={item.id}>{item.node}</div>
          ))}
        </div>

        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-4 glass-panel-strong flex h-10 w-10 items-center justify-center rounded-full text-accent transition-transform duration-300 ease-glass hover:scale-105 z-10"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="border-t border-border/10 p-3">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-glass-sm bg-surface-strong/60 px-3 py-1.5 text-xs">
            <span className="truncate text-ink-soft">
              {t("community", "replyingTo")} <span className="font-medium text-ink">{replyTo.users?.username}</span>: {replyTo.content}
            </span>
            <button type="button" onClick={() => setReplyTo(null)}>
              <X className="h-3.5 w-3.5 text-ink-soft" />
            </button>
          </div>
        )}

        {notice && <p className="mb-2 text-xs text-status-warning">{notice}</p>}

        {user ? (
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            {menuOpen && (
              <ChatCommandMenu<MenuItem>
                anchorRef={inputRef}
                items={menuItems}
                getKey={(item) =>
                  item.kind === "command"
                    ? item.command.token
                    : item.kind === "sensor"
                      ? item.sensor.id
                      : item.kind === "govopt"
                        ? `${item.govKind}:${item.opt}`
                        : `${item.govKind}:${JSON.stringify(govResultDisplay(item.govKind, item.item, locale))}`
                }
                highlightedIndex={clampedIndex}
                onHover={setHighlightedIndex}
                onSelect={selectMenuItem}
                emptyMessage={
                  slash?.type === "sensor"
                    ? t("sensor", "noMatch")
                    : slash?.type === "gov"
                      ? govSearching
                        ? t("common", "loading")
                        : slash.query.trim()
                          ? t("community", "govSearchNoMatch")
                          : t("community", "govOptSearchDesc")
                      : undefined
                }
                renderItem={(item) =>
                  item.kind === "command" ? (
                    <CommandMenuRow command={item.command} />
                  ) : item.kind === "govopt" ? (
                    <>
                      {item.opt === "highest" ? (
                        <TrendingUp className="h-4 w-4 shrink-0" />
                      ) : item.opt === "local" ? (
                        <LocateFixed className="h-4 w-4 shrink-0" />
                      ) : (
                        <Search className="h-4 w-4 shrink-0" />
                      )}
                      <span className="flex flex-col">
                        <span className="font-medium">
                          {item.opt === "highest"
                            ? t("community", "govOptHighest")
                            : item.opt === "local"
                              ? t("gov", "localToggle")
                              : t("community", "govOptSearch")}
                        </span>
                        {item.opt === "search" && (
                          <span className="text-xs text-ink-soft">{t("community", "govOptSearchDesc")}</span>
                        )}
                      </span>
                    </>
                  ) : item.kind === "govresult" ? (
                    (() => {
                      const d = govResultDisplay(item.govKind, item.item, locale)
                      return (
                        <>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{d.title}</span>
                            <span className="truncate text-xs text-ink-soft">{d.sub}</span>
                          </span>
                          {d.value && <span className="shrink-0 font-mono text-xs text-ink-soft">{d.value}</span>}
                        </>
                      )
                    })()
                  ) : (
                    <>
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          latestBySensorId[item.sensor.sensor_id]
                            ? SEVERITY_DOT_CLASS[
                                computeSeverity(
                                  latestBySensorId[item.sensor.sensor_id]!.level,
                                  item.sensor.warning_level_cm,
                                  item.sensor.danger_level_cm,
                                )
                              ]
                            : "bg-ink-soft/40",
                        )}
                      />
                      <span className="flex-1 truncate">{item.sensor.label}</span>
                      {latestBySensorId[item.sensor.sensor_id] && (
                        <span className="font-mono text-xs text-ink-soft">{latestBySensorId[item.sensor.sensor_id]!.level.toFixed(1)} cm</span>
                      )}
                    </>
                  )
                }
              />
            )}

            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="glass-panel-strong flex-1 px-3.5 py-2.5 text-sm outline-none"
              maxLength={500}
            />
            {slash?.type === "ai" && <EngineSettings direction="up" />}
            <button
              type="submit"
              disabled={!draft.trim() || slash?.type === "sensor" || slash?.type === "menu" || slash?.type === "gov"}
              className="glass-panel-strong flex h-10 w-10 items-center justify-center text-accent transition-transform duration-300 ease-glass hover:scale-105 disabled:opacity-50"
              aria-label={t("community", "send")}
            >
              {slash?.type === "ai" && isSendingAI ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <Link
            href="/auth/login"
            className="glass-panel-strong block w-full py-2.5 text-center text-sm font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.01]"
          >
            {t("community", "loginToChat")}
          </Link>
        )}
      </div>
    </div>
  )
}

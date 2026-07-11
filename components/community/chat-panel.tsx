"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Send, X, ArrowDown, Gauge, Bot, LoaderCircle } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { useCommunityChat } from "@/hooks/use-community-chat"
import { useMessageReactions } from "@/hooks/use-message-reactions"
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
import { AIExchangeMessage, type AIExchange } from "@/components/community/ai-exchange-message"
import type { AIContext, ChatMessage, Sensor, WarningSeverity } from "@/types"

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

type SlashCommand = { token: string; key: "sensor" | "ai"; descKey: "commandSensorDesc" | "commandAiDesc" }

const SLASH_COMMANDS: SlashCommand[] = [
  { token: "/sensor", key: "sensor", descKey: "commandSensorDesc" },
  { token: "/AI", key: "ai", descKey: "commandAiDesc" },
]

type SlashState =
  | { type: "menu"; matches: SlashCommand[] }
  | { type: "sensor"; query: string }
  | { type: "ai"; question: string }
  | null

function parseSlash(draft: string): SlashState {
  if (!draft.startsWith("/")) return null
  const spaceIdx = draft.indexOf(" ")
  const cmdRaw = spaceIdx === -1 ? draft.slice(1) : draft.slice(1, spaceIdx)
  const cmd = cmdRaw.toLowerCase()

  if (spaceIdx === -1) {
    const matches = SLASH_COMMANDS.filter((c) => c.token.slice(1).toLowerCase().startsWith(cmd))
    return matches.length > 0 ? { type: "menu", matches } : null
  }

  if (cmd === "sensor") return { type: "sensor", query: draft.slice(spaceIdx + 1) }
  if (cmd === "ai") return { type: "ai", question: draft.slice(spaceIdx + 1) }
  return null
}

type MenuItem = { kind: "command"; command: SlashCommand } | { kind: "sensor"; sensor: Sensor }

export function ChatPanel() {
  const { t, locale } = useLanguage()
  const { user } = useAuth()
  const { messages, loading, sendMessage, sendAIExchange, sendSensorCard } = useCommunityChat()
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])
  const { byMessage, toggleReaction } = useMessageReactions(messageIds)

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
      items.push({ id: "ai-live", node: <AIExchangeMessage exchange={liveAIExchange} /> })
    }

    return items
  }, [messages, byMessage, sensors, hiddenIds, liveAIExchange, locale, user])

  const slash = useMemo(() => parseSlash(draft), [draft])

  const menuItems = useMemo<MenuItem[]>(() => {
    if (slash?.type === "menu") return slash.matches.map((command) => ({ kind: "command" as const, command }))
    if (slash?.type === "sensor") {
      const q = slash.query.trim().toLowerCase()
      return sensors
        .filter((s) => !q || s.label.toLowerCase().includes(q) || s.sensor_id.toLowerCase().includes(q))
        .map((sensor) => ({ kind: "sensor" as const, sensor }))
    }
    return []
  }, [slash, sensors])

  const menuOpen = slash?.type === "menu" || slash?.type === "sensor"
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
      setDraft(`${item.command.token} `)
      inputRef.current?.focus()
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

    if (slash?.type === "sensor" || slash?.type === "menu") {
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
                getKey={(item) => (item.kind === "command" ? item.command.token : item.sensor.id)}
                highlightedIndex={clampedIndex}
                onHover={setHighlightedIndex}
                onSelect={selectMenuItem}
                emptyMessage={slash?.type === "sensor" ? t("sensor", "noMatch") : undefined}
                renderItem={(item) =>
                  item.kind === "command" ? (
                    <>
                      {item.command.key === "sensor" ? <Gauge className="h-4 w-4 shrink-0" /> : <Bot className="h-4 w-4 shrink-0" />}
                      <span className="flex flex-col">
                        <span className="font-mono font-medium">{item.command.token}</span>
                        <span className="text-xs text-ink-soft">{t("community", item.command.descKey)}</span>
                      </span>
                    </>
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
            <button
              type="submit"
              disabled={!draft.trim() || slash?.type === "sensor" || slash?.type === "menu"}
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

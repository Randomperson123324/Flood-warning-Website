"use client"

import { Bot, LoaderCircle, Terminal } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { MarkdownMessage } from "@/components/ai-assistant/markdown-message"
import { ReactionBar } from "@/components/community/reaction-bar"
import { cn } from "@/lib/utils"
import type { ReactionSummary } from "@/hooks/use-message-reactions"

export interface AIExchange {
  id: string
  question: string
  answer: string
  isLoading: boolean
  toolStatus?: string
}

interface AIExchangeMessageProps {
  exchange: AIExchange
  /** Who asked, and when — shown in the header the same way as a `/sensor`
   * card, instead of the exchange floating with no attribution. */
  username?: string
  time?: string
  /** Same convention as MessageItem/SensorInfoCard: whose exchange this is
   * relative to the viewer, so it lands on the same side of the feed. */
  isMine?: boolean
  /** Reactions on the persisted exchange (keyed by the same `messages.id`
   * used for reply text and sensor cards). Omitted while the answer is
   * still streaming — there's no persisted row to react to yet. */
  reactions?: ReactionSummary[]
  onToggleReaction?: (reactionType: string) => void
}

/** Renders one `/AI` question + streamed answer as a pair of chat bubbles,
 * reusing the same AI plumbing (useAIChat, MarkdownMessage) and glass style
 * as the floating assistant panel — just inline in the community feed.
 * Attributed and side-aligned the same way as a `/sensor` card: the asker's
 * name up top, whole exchange on their side of the feed. */
export function AIExchangeMessage({ exchange, username, time, isMine, reactions, onToggleReaction }: AIExchangeMessageProps) {
  const { t } = useLanguage()
  const canReact = !exchange.isLoading && !!onToggleReaction

  return (
    <div className={cn("flex animate-fade-in-up flex-col gap-1", isMine ? "items-end" : "items-start")}>
      <div className="flex items-baseline gap-1.5 px-1 text-xs text-ink-soft">
        <Terminal className="h-3.5 w-3.5 shrink-0 self-center text-accent" />
        <span className="font-medium text-accent">/AI</span>
        {username && (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-ink">{username}</span>
          </>
        )}
        {time && <span>{time}</span>}
      </div>

      <div className={cn("flex max-w-[85%] flex-col gap-1", isMine ? "items-end" : "items-start")}>
        <div className="glass-panel-strong px-3.5 py-2 text-sm bg-accent/10">
          <p className="whitespace-pre-wrap break-words">{exchange.question}</p>
        </div>
      </div>

      <div className={cn("group flex max-w-[85%] flex-col gap-1", isMine ? "items-end" : "items-start")}>
        <div className="flex items-center gap-1.5 px-1 text-xs text-ink-soft">
          <Bot className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-accent">{t("ai", "title")}</span>
        </div>
        <div className="glass-panel-strong px-3.5 py-2 text-sm">
          {exchange.isLoading && !exchange.answer ? (
            exchange.toolStatus ? (
              <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                {exchange.toolStatus}
              </span>
            ) : (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-ink-soft" />
            )
          ) : (
            <>
              <MarkdownMessage content={exchange.answer} />
              {exchange.isLoading && <LoaderCircle className="mt-1 h-3 w-3 animate-spin text-ink-soft" />}
            </>
          )}
        </div>

        {canReact && <ReactionBar reactions={reactions ?? []} onToggleReaction={onToggleReaction!} align={isMine ? "end" : "start"} />}
      </div>
    </div>
  )
}

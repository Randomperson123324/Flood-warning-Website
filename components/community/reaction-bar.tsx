"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ReactionSummary } from "@/hooks/use-message-reactions"

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮"]

interface ReactionBarProps {
  reactions: ReactionSummary[]
  onToggleReaction: (reactionType: string) => void
  align?: "start" | "end"
  className?: string
  /** Extra control (e.g. a reply button) shown in the same hover row as the quick-react buttons. */
  leading?: ReactNode
  /** Fade the quick-react row in on hover of an ancestor with the `group` class. Set false to always show it (e.g. touch-first surfaces like sensor cards). */
  showOnHover?: boolean
}

/** Quick-react buttons + persisted reaction pills, shared by plain chat
 * messages, `/AI` exchanges, and `/sensor` cards — any bubble in the
 * community feed that has a real `messages.id` can react the same way. */
export function ReactionBar({
  reactions,
  onToggleReaction,
  align = "start",
  className,
  leading,
  showOnHover = true,
}: ReactionBarProps) {
  return (
    <div className={cn("flex flex-col gap-1", align === "end" ? "items-end" : "items-start", className)}>
      <div
        className={cn(
          "flex items-center gap-1 px-1 transition-opacity",
          showOnHover && "opacity-0 group-hover:opacity-100",
        )}
      >
        {leading}
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggleReaction(emoji)}
            className="text-xs hover:scale-125 transition-transform"
            aria-label={`react ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {reactions.map((r) => (
            <button
              key={r.reaction_type}
              type="button"
              onClick={() => onToggleReaction(r.reaction_type)}
              className={cn(
                "glass-panel-strong flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                r.reactedByMe && "ring-1 ring-accent",
              )}
            >
              <span>{r.reaction_type}</span>
              <span className="text-ink-soft">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

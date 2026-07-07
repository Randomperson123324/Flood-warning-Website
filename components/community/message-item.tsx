"use client"

import { Reply } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types"
import type { ReactionSummary } from "@/hooks/use-message-reactions"

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮"]

interface MessageItemProps {
  message: ChatMessage
  reactions: ReactionSummary[]
  onReply: (message: ChatMessage) => void
  onToggleReaction: (messageId: string, reactionType: string) => void
}

export function MessageItem({ message, reactions, onReply, onToggleReaction }: MessageItemProps) {
  const { user } = useAuth()
  const { locale } = useLanguage()
  const isMine = message.user_id === user?.id
  const username = message.users?.username ?? "?"

  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" })
    : ""

  return (
    <div className={cn("group flex animate-fade-in-up flex-col gap-1", isMine ? "items-end" : "items-start")}>
      <div className={cn("flex max-w-[85%] flex-col gap-1", isMine ? "items-end" : "items-start")}>
        <div className="flex items-baseline gap-2 px-1 text-xs text-ink-soft">
          <span className="font-medium">{username}</span>
          <span>{time}</span>
        </div>

        <div className={cn("glass-panel-strong px-3.5 py-2 text-sm", isMine && "bg-accent/10")}>
          {message.reply_to_content && (
            <div className="mb-1 border-l-2 border-accent/50 pl-2 text-xs text-ink-soft">
              <span className="font-medium">{message.reply_to_username}</span>: {message.reply_to_content}
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        <div className="flex items-center gap-1 px-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={() => onReply(message)} className="text-ink-soft hover:text-accent" aria-label="reply">
            <Reply className="h-3.5 w-3.5" />
          </button>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction(message.id, emoji)}
              className="text-xs hover:scale-125 transition-transform"
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
                onClick={() => onToggleReaction(message.id, r.reaction_type)}
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
    </div>
  )
}

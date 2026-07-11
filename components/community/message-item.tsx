"use client"

import { Reply } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"
import { ReactionBar } from "@/components/community/reaction-bar"
import type { ChatMessage } from "@/types"
import type { ReactionSummary } from "@/hooks/use-message-reactions"

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

        <ReactionBar
          reactions={reactions}
          onToggleReaction={(type) => onToggleReaction(message.id, type)}
          align={isMine ? "end" : "start"}
          leading={
            <button type="button" onClick={() => onReply(message)} className="text-ink-soft hover:text-accent" aria-label="reply">
              <Reply className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>
    </div>
  )
}

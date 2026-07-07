"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Send, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { useCommunityChat } from "@/hooks/use-community-chat"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { SITE_CONFIG } from "@/lib/config"
import { MessageItem } from "@/components/community/message-item"
import type { ChatMessage } from "@/types"

export function ChatPanel() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { messages, loading, sendMessage } = useCommunityChat()
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])
  const { byMessage, toggleReaction } = useMessageReactions(messageIds)

  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    const { error } = await sendMessage({ content: draft, replyTo })
    if (error === "RATE_LIMITED") {
      setNotice(t("community", "rateLimited"))
      setTimeout(() => setNotice(null), SITE_CONFIG.community.chatNoticeDurationMs)
      return
    }
    setDraft("")
    setReplyTo(null)
  }

  return (
    <div className="glass-panel flex h-[clamp(24rem,70vh,42rem)] flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {!loading && messages.length === 0 && <p className="py-8 text-center text-sm text-ink-soft">{t("community", "empty")}</p>}

        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            reactions={byMessage[message.id] ?? []}
            onReply={setReplyTo}
            onToggleReaction={toggleReaction}
          />
        ))}
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
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("community", "placeholder")}
              className="glass-panel-strong flex-1 px-3.5 py-2.5 text-sm outline-none"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="glass-panel-strong flex h-10 w-10 items-center justify-center text-accent transition-transform duration-300 ease-glass hover:scale-105 disabled:opacity-50"
              aria-label={t("community", "send")}
            >
              <Send className="h-4 w-4" />
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

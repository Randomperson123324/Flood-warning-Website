"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, LoaderCircle, Send, Trash2, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAIChat } from "@/hooks/use-ai-chat"
import { MarkdownMessage } from "@/components/ai-assistant/markdown-message"
import { cn } from "@/lib/utils"
import type { AIContext } from "@/types"

interface AssistantPanelProps {
  context: AIContext
  open: boolean
  onClose: () => void
}

export function AssistantPanel({ context, open, onClose }: AssistantPanelProps) {
  const { t } = useLanguage()
  const { chatHistory, autoAnalysis, analysisStatus, isAnalyzing, isSending, sendMessage, clearHistory } = useAIChat(context, open)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [chatHistory])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isSending) return
    sendMessage(input)
    setInput("")
  }

  return (
    <div
      className={cn(
        "glass-panel fixed bottom-4 right-4 z-50 flex h-[clamp(28rem,70vh,36rem)] w-[calc(100vw-2rem)] max-w-sm origin-bottom-right flex-col overflow-hidden transition-all duration-300 ease-glass sm:bottom-6 sm:right-6",
        open ? "scale-100 opacity-100" : "pointer-events-none scale-0 opacity-0",
      )}
      aria-hidden={!open}
    >
      <div className="flex items-center gap-2 border-b border-border/10 px-4 py-3">
        <Bot className="h-5 w-5 text-accent" />
        <p className="flex-1 font-medium">{t("ai", "title")}</p>
        {chatHistory.length > 0 && (
          <button type="button" onClick={clearHistory} title={t("ai", "clear")} className="text-ink-soft hover:text-status-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="close">
          <X className="h-4 w-4 text-ink-soft" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="glass-panel-strong p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent">
            <Bot className="h-3.5 w-3.5" />
            {t("ai", "autoAnalysis")}
            {isAnalyzing && <LoaderCircle className="h-3 w-3 animate-spin" />}
          </div>
          {autoAnalysis ? (
            <MarkdownMessage content={autoAnalysis} />
          ) : (
            <p className="text-sm text-ink-soft">{analysisStatus || t("ai", "waitingForData")}</p>
          )}
        </div>

        {chatHistory.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("glass-panel-strong max-w-[85%] px-3.5 py-2", msg.role === "user" && "bg-accent/10")}>
              {msg.isLoading ? (
                msg.toolStatus ? (
                  <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <LoaderCircle className="h-3 w-3 animate-spin" />
                    {msg.toolStatus}
                  </span>
                ) : (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-ink-soft" />
                )
              ) : msg.role === "assistant" ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border/10 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("ai", "placeholder")}
          disabled={isSending}
          className="glass-panel-strong flex-1 px-3.5 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="glass-panel-strong flex h-10 w-10 items-center justify-center text-accent disabled:opacity-50"
          aria-label={t("common", "retry")}
        >
          {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      <p className="pb-2 text-center text-[11px] text-ink-soft">{t("ai", "disclaimer")}</p>
    </div>
  )
}

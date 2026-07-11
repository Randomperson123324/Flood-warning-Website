"use client"

import { Bot, LoaderCircle, Terminal } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { MarkdownMessage } from "@/components/ai-assistant/markdown-message"

export interface AIExchange {
  id: string
  question: string
  answer: string
  isLoading: boolean
  toolStatus?: string
}

interface AIExchangeMessageProps {
  exchange: AIExchange
}

/** Renders one `/AI` question + streamed answer as a pair of chat bubbles,
 * reusing the same AI plumbing (useAIChat, MarkdownMessage) and glass style
 * as the floating assistant panel — just inline in the community feed. */
export function AIExchangeMessage({ exchange }: AIExchangeMessageProps) {
  const { t } = useLanguage()

  return (
    <div className="flex animate-fade-in-up flex-col gap-3">
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 px-1 text-xs text-ink-soft">
          <Terminal className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-accent">/AI</span>
        </div>
        <div className="glass-panel-strong max-w-[85%] bg-accent/10 px-3.5 py-2 text-sm">
          <p className="whitespace-pre-wrap break-words">{exchange.question}</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-1.5 px-1 text-xs text-ink-soft">
          <Bot className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-accent">{t("ai", "title")}</span>
        </div>
        <div className="glass-panel-strong max-w-[85%] px-3.5 py-2 text-sm">
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
      </div>
    </div>
  )
}

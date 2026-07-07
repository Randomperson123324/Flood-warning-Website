"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { AssistantPanel } from "@/components/ai-assistant/assistant-panel"
import { cn } from "@/lib/utils"
import type { AIContext } from "@/types"

export function AssistantLauncher({ context }: { context: AIContext }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Always mounted (never unmounted) — open/close only toggles CSS
          visibility below, so the chat history living inside AssistantPanel's
          useAIChat() hook survives closing the panel. It only resets on a
          real page reload/navigation, which is the intended behavior. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "glass-panel-strong fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center text-accent shadow-glass transition-all duration-300 ease-glass hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6",
          open && "pointer-events-none scale-0 opacity-0",
        )}
        aria-label="AI assistant"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
      >
        <Bot className="h-6 w-6" />
      </button>

      <AssistantPanel context={context} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

"use client"

// บล็อกความคิด (reasoning) ของโมเดลโหมดคิด — พับเก็บได้แบบ LM Studio
// ใช้ทั้งในแผง AI ลอย (assistant-panel) และ /AI ในแชทชุมชน (ai-exchange-message)

import { useEffect, useState } from "react"
import { Brain, ChevronDown, LoaderCircle } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"

interface ThinkingBlockProps {
  text: string
  /** true = โมเดลยังคิดอยู่ — กางบล็อกให้เห็น stream แล้วพับเองเมื่อเริ่มตอบ */
  streaming: boolean
}

export function ThinkingBlock({ text, streaming }: ThinkingBlockProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(streaming)
  // ผู้ใช้กดพับ/กางเองแล้ว → เลิก auto-พับ ไม่งั้นบล็อกจะหุบสวนมือตอนคำตอบเริ่มมา
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (!streaming && !userToggled) setOpen(false)
  }, [streaming, userToggled])

  return (
    <div className="mb-1.5 rounded-lg border border-border/10">
      <button
        type="button"
        onClick={() => {
          setUserToggled(true)
          setOpen((v) => !v)
        }}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-ink-soft transition-colors hover:text-accent"
      >
        <Brain className="h-3 w-3 shrink-0 text-accent" />
        <span className="font-medium">{t("ai", "thoughtsLabel")}</span>
        {streaming && <LoaderCircle className="h-3 w-3 shrink-0 animate-spin" />}
        <ChevronDown className={cn("ml-auto h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words border-t border-border/10 px-2 py-1.5 text-xs text-ink-soft">
          {text}
        </p>
      )}
    </div>
  )
}

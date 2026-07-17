"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SITE_CONFIG } from "@/lib/config"
import { useAIEngine, type AIEngineKind } from "@/hooks/use-ai-engine"
import { useLanguage } from "@/hooks/use-language"
import { streamLocalReply } from "@/lib/ai/local/engine"
import { streamCpuReply } from "@/lib/ai/local/cpu-engine"
import type { AIContext, WeatherData } from "@/types"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isLoading?: boolean
  // ข้อความสถานะชั่วคราวตอน AI กำลังเรียก tool อยู่ (เช่น "🔧 กำลังตรวจสอบสภาพอากาศ...")
  // จะถูกเคลียร์ทิ้งทันทีที่มีเนื้อหาจริง (message.delta) เข้ามา
  toolStatus?: string
  // reasoning ของโมเดล (โหมดคิดของ AI บนเครื่อง) — โชว์เป็นบล็อกความคิดพับได้
  thinking?: string
  // ข้อความ assistant นี้สร้างด้วย engine ไหน — ไว้ติดป้าย "บนเครื่อง"
  engine?: AIEngineKind
}

interface StreamHandlers {
  onContent: (fullTextSoFar: string) => void
  onToolCall?: (label: string) => void
  onThinking?: (thinkingTextSoFar: string) => void
}

// อ่าน SSE stream จาก /api/ai (รูปแบบ event ตามแนวทาง LM Studio: chat.start /
// tool_call.start / message.delta / chat.end / error)
async function streamAIReply(
  messages: { role: "user" | "assistant"; content: string }[],
  context: AIContext,
  handlers: StreamHandlers,
): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  })
  if (!res.ok || !res.body) throw new Error(`AI API error: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""

    for (const raw of events) {
      const line = raw.trim()
      if (!line.startsWith("data:")) continue
      const payload = line.slice("data:".length).trim()
      if (!payload) continue

      let event: { type: string; content?: string; label?: string; message?: string }
      try {
        event = JSON.parse(payload)
      } catch {
        continue
      }

      if (event.type === "message.delta" && event.content) {
        fullText += event.content
        handlers.onContent(fullText)
      } else if (event.type === "tool_call.start" && event.label) {
        handlers.onToolCall?.(event.label)
      } else if (event.type === "error") {
        throw new Error(event.message ?? "AI service error")
      }
    }
  }

  return fullText
}

export function useAIChat(context: AIContext, isOpen: boolean) {
  const { engine, localBackend, localModelId, status: engineStatus, thinking, sendContext, loadModel } = useAIEngine()
  const { t } = useLanguage()
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [autoAnalysis, setAutoAnalysis] = useState("")
  const [analysisStatus, setAnalysisStatus] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const lastAnalysisRef = useRef(0)
  const lastLevelRef = useRef(context.currentLevel)
  const contextRef = useRef(context)
  contextRef.current = context
  // ให้ callback ที่สร้างครั้งเดียว (runAutoAnalysis) เห็นค่า engine ปัจจุบันเสมอ
  const engineRef = useRef({ engine, localBackend, localModelId, phase: engineStatus.phase, thinking, sendContext, loadModel, t })
  engineRef.current = { engine, localBackend, localModelId, phase: engineStatus.phase, thinking, sendContext, loadModel, t }

  // เลือกเส้นทางตาม engine ที่ผู้ใช้ตั้งไว้: cloud → SSE ผ่าน /api/ai,
  // local → รันในเบราว์เซอร์ (GPU ผ่าน WebLLM หรือ CPU ผ่าน wllama ตาม localBackend)
  // โหลดโมเดลก่อนถ้ายังไม่พร้อม โดยโชว์ % ผ่าน toolStatus
  const streamReply = useCallback(
    async (messages: { role: "user" | "assistant"; content: string }[], handlers: StreamHandlers) => {
      const {
        engine: kind,
        localBackend: backend,
        localModelId: modelId,
        thinking: think,
        sendContext: includeContext,
        loadModel: load,
        t: translate,
      } = engineRef.current
      if (kind !== "local") return streamAIReply(messages, contextRef.current, handlers)

      await load((pct) =>
        handlers.onToolCall?.(
          pct >= 100 ? translate("ai", "preparingModel") : `${translate("ai", "loadingModelStatus")} ${pct}%`,
        ),
      )
      const labels = {
        fetchingContext: translate("ai", "fetchingContext"),
        loadingModel: translate("ai", "loadingModelStatus"),
        preparingModel: translate("ai", "preparingModel"),
        thinking: translate("ai", "thinking"),
        analyzingPrompt: translate("ai", "analyzingPrompt"),
        thinkingStatus: translate("ai", "thinkingStatus"),
      }
      if (backend === "cpu") {
        return streamCpuReply(messages, contextRef.current, handlers, { labels, thinking: think, includeContext })
      }
      return streamLocalReply(messages, contextRef.current, handlers, { modelId, labels, thinking: think, includeContext })
    },
    [],
  )

  const runAutoAnalysis = useCallback(async () => {
    // โหมด on-device: วิเคราะห์อัตโนมัติเฉพาะตอนโมเดลโหลดพร้อมแล้วเท่านั้น —
    // ห้ามเป็นตัวจุดชนวนดาวน์โหลดโมเดล ~2.5 GB หรือปลุก GPU เองเงียบๆ
    if (engineRef.current.engine === "local" && engineRef.current.phase !== "ready") return
    // ปิด "ส่งข้อมูลเว็บให้ AI" อยู่ — วิเคราะห์สถานการณ์โดยไม่มีข้อมูลไม่มีความหมาย
    if (engineRef.current.engine === "local" && !engineRef.current.sendContext) return

    const now = Date.now()
    if (now - lastAnalysisRef.current < 120_000) return
    lastAnalysisRef.current = now

    setIsAnalyzing(true)
    setAutoAnalysis("")
    setAnalysisStatus("")
    try {
      await streamReply(
        [{ role: "user", content: "วิเคราะห์สถานการณ์น้ำปัจจุบันแบบสรุปสั้น ไม่เกิน 3 ประเด็น" }],
        {
          onContent: (partial) => {
            setAnalysisStatus("")
            setAutoAnalysis(partial)
          },
          onToolCall: (label) => setAnalysisStatus(label),
          // การ์ดสรุปไม่โชว์เนื้อ reasoning (รก) — บอกแค่สถานะว่ากำลังคิด
          onThinking: () => setAnalysisStatus(engineRef.current.t("ai", "thinkingStatus")),
        },
      )
    } catch (err) {
      console.error("Auto-analysis error:", err)
    } finally {
      setIsAnalyzing(false)
      setAnalysisStatus("")
    }
  }, [streamReply])

  const sendMessage = async (userMessage: string, onComplete?: (finalText: string) => void) => {
    if (isSending || !userMessage.trim()) return

    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: new Date() }
    const loadingMsg: ChatMessage = { role: "assistant", content: "", timestamp: new Date(), isLoading: true }

    setChatHistory((prev) => [...prev, userMsg, loadingMsg])
    setIsSending(true)

    const activeEngine = engineRef.current.engine
    try {
      const history = [...chatHistory, userMsg].map((m) => ({ role: m.role, content: m.content }))
      // reasoning สะสมของคำตอบนี้ — เก็บไว้นอก setState เพื่อให้ทุก callback
      // (สถานะ/เนื้อหา) แปะความคิดล่าสุดติดข้อความไปด้วยเสมอ ไม่หายตอนสลับสถานะ
      let thinkingText = ""
      const finalText = await streamReply(history, {
        onContent: (partial) => {
          setChatHistory((prev) => [
            ...prev.slice(0, -1),
            {
              role: "assistant",
              content: partial,
              timestamp: new Date(),
              isLoading: false,
              thinking: thinkingText || undefined,
              engine: activeEngine,
            },
          ])
        },
        onToolCall: (label) => {
          setChatHistory((prev) => [
            ...prev.slice(0, -1),
            {
              role: "assistant",
              content: "",
              timestamp: new Date(),
              isLoading: true,
              toolStatus: label,
              thinking: thinkingText || undefined,
            },
          ])
        },
        onThinking: (partialThinking) => {
          thinkingText = partialThinking
          setChatHistory((prev) => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, thinking: thinkingText }]
          })
        },
      })
      onComplete?.(finalText)
    } catch {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content:
            activeEngine === "local" ? engineRef.current.t("ai", "localLoadError") : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const clearHistory = () => setChatHistory([])

  // Auto-analysis only ever runs while the panel is actually open. Since
  // AssistantPanel is now permanently mounted (so chat history survives
  // closing it), these effects would otherwise fire in the background
  // forever, hitting the AI API every few minutes even with the panel closed.
  useEffect(() => {
    if (isOpen && context.currentLevel > 0) {
      runAutoAnalysis()
    }
  }, [runAutoAnalysis, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const levelChanged = Math.abs(context.currentLevel - lastLevelRef.current) > 2
    if (levelChanged) {
      lastLevelRef.current = context.currentLevel
      runAutoAnalysis()
    }
    // โหมด on-device ไม่ตั้ง interval วิเคราะห์อัตโนมัติ — generation หนึ่งครั้ง
    // กิน GPU/แบตจริงจัง ไม่เหมาะกับการรันเบื้องหลังทุกๆ ไม่กี่นาที
    if (engine === "local") return
    const interval = setInterval(runAutoAnalysis, SITE_CONFIG.fetch.aiAnalysisIntervalMs)
    return () => clearInterval(interval)
  }, [context.currentLevel, runAutoAnalysis, isOpen, engine])

  return { chatHistory, autoAnalysis, analysisStatus, isAnalyzing, isSending, sendMessage, clearHistory }
}

export type { WeatherData }

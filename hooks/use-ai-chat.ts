"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SITE_CONFIG } from "@/lib/config"
import type { AIContext, WeatherData } from "@/types"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isLoading?: boolean
  // ข้อความสถานะชั่วคราวตอน AI กำลังเรียก tool อยู่ (เช่น "🔧 กำลังตรวจสอบสภาพอากาศ...")
  // จะถูกเคลียร์ทิ้งทันทีที่มีเนื้อหาจริง (message.delta) เข้ามา
  toolStatus?: string
}

interface StreamHandlers {
  onContent: (fullTextSoFar: string) => void
  onToolCall?: (label: string) => void
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [autoAnalysis, setAutoAnalysis] = useState("")
  const [analysisStatus, setAnalysisStatus] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const lastAnalysisRef = useRef(0)
  const lastLevelRef = useRef(context.currentLevel)
  const contextRef = useRef(context)
  contextRef.current = context

  const runAutoAnalysis = useCallback(async () => {
    const now = Date.now()
    if (now - lastAnalysisRef.current < 120_000) return
    lastAnalysisRef.current = now

    setIsAnalyzing(true)
    setAutoAnalysis("")
    setAnalysisStatus("")
    try {
      await streamAIReply(
        [{ role: "user", content: "วิเคราะห์สถานการณ์น้ำปัจจุบันแบบสรุปสั้น ไม่เกิน 3 ประเด็น" }],
        contextRef.current,
        {
          onContent: (partial) => {
            setAnalysisStatus("")
            setAutoAnalysis(partial)
          },
          onToolCall: (label) => setAnalysisStatus(label),
        },
      )
    } catch (err) {
      console.error("Auto-analysis error:", err)
    } finally {
      setIsAnalyzing(false)
      setAnalysisStatus("")
    }
  }, [])

  const sendMessage = async (userMessage: string) => {
    if (isSending || !userMessage.trim()) return

    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: new Date() }
    const loadingMsg: ChatMessage = { role: "assistant", content: "", timestamp: new Date(), isLoading: true }

    setChatHistory((prev) => [...prev, userMsg, loadingMsg])
    setIsSending(true)

    try {
      const history = [...chatHistory, userMsg].map((m) => ({ role: m.role, content: m.content }))
      await streamAIReply(history, contextRef.current, {
        onContent: (partial) => {
          setChatHistory((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: partial, timestamp: new Date(), isLoading: false },
          ])
        },
        onToolCall: (label) => {
          setChatHistory((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: "", timestamp: new Date(), isLoading: true, toolStatus: label },
          ])
        },
      })
    } catch {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", timestamp: new Date() },
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
    const interval = setInterval(runAutoAnalysis, SITE_CONFIG.fetch.aiAnalysisIntervalMs)
    return () => clearInterval(interval)
  }, [context.currentLevel, runAutoAnalysis, isOpen])

  return { chatHistory, autoAnalysis, analysisStatus, isAnalyzing, isSending, sendMessage, clearHistory }
}

export type { WeatherData }

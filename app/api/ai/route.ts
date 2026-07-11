import { NextRequest } from "next/server"
import { buildSystemPrompt } from "@/lib/ai/types"
import { createGeminiProvider } from "@/lib/ai/providers/gemini"
import { createLMStudioProvider } from "@/lib/ai/providers/lmstudio"
import { getToolDefinitions } from "@/lib/ai/tools/definitions"
import { executeTool, getToolStatusLabel } from "@/lib/ai/tools/tool-registry"
import { SITE_CONFIG } from "@/lib/config"
import type { AIContext, AIMessage } from "@/types"

interface AIRequest {
  messages: AIMessage[]
  context: AIContext
}

// รูปแบบ event ที่ stream กลับไปหา client — ตั้งชื่อตามแนวทางของ LM Studio SSE
// (chat.start / message.delta / tool_call.start / chat.end / error)
// ดู: https://lmstudio.ai/docs/developer/rest/streaming-events
type ClientStreamEvent =
  | { type: "chat.start" }
  | { type: "message.delta"; content: string }
  | { type: "tool_call.start"; tool: string; label: string }
  | { type: "chat.end" }
  | { type: "error"; message: string }

function getProvider() {
  // Gemini first (preferred) — fallback to LM Studio if no API key
  if (process.env.GEMINI_API_KEY) {
    return createGeminiProvider()
  }
  if (SITE_CONFIG.ai.provider === "lmstudio") {
    console.warn("GEMINI_API_KEY not set — falling back to LM Studio")
    return createLMStudioProvider()
  }
  throw new Error("No AI provider configured: set GEMINI_API_KEY or AI_PROVIDER=lmstudio")
}

function sseEncode(event: ClientStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: NextRequest) {
  let body: AIRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const { messages, context } = body
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // client อาจตัดการเชื่อมต่อกลางคัน (ปิดแท็บ, Fast Refresh รีโหลดหน้า,
      // component unmount แล้ว fetch ถูกยกเลิก) — ตอนนั้น runtime จะปิด
      // controller ให้เองผ่าน cancel() ด้านล่าง ต้องกันไว้ไม่ให้ enqueue/close
      // ซ้ำจนเกิด "Controller is already closed"
      let closed = false

      const safeEnqueue = (event: ClientStreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(sseEncode(event))
        } catch {
          closed = true
        }
      }

      safeEnqueue({ type: "chat.start" })

      try {
        const timestamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
        const systemInstruction = buildSystemPrompt(context, timestamp)
        const provider = getProvider()

        for await (const event of provider.chatStream({
          systemInstruction,
          messages,
          tools: getToolDefinitions(),
          onToolCall: (name, args) =>
            executeTool(name, args, {
              sensorId: context.sensorId,
              sensorLat: context.sensorLat,
              sensorLon: context.sensorLon,
              sensorLabel: context.sensorLabel,
            }),
        })) {
          if (closed) break // client หลุดไปแล้ว ไม่ต้อง stream ต่อให้เปลือง token/quota

          if (event.type === "content") {
            safeEnqueue({ type: "message.delta", content: event.text })
          } else if (event.type === "tool_call") {
            safeEnqueue({ type: "tool_call.start", tool: event.name, label: getToolStatusLabel(event.name) })
          }
        }

        safeEnqueue({ type: "chat.end" })
      } catch (error) {
        console.error("AI route error:", error)
        safeEnqueue({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      } finally {
        if (!closed) {
          try {
            controller.close()
          } catch {
            // ปิดไปแล้วจาก cancel() พอดี ไม่ต้องทำอะไรต่อ
          }
        }
      }
    },
    cancel() {
      // เรียกอัตโนมัติเมื่อฝั่ง client ยกเลิกการอ่าน stream (reader.cancel()
      // หรือ fetch ถูก abort) — ไม่มีอะไรต้องเคลียร์เพิ่ม เพราะ flag `closed`
      // ใน start() จะไปเช็คเองในรอบ loop ถัดไป
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

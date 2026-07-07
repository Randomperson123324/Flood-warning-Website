import type { AIProvider, AIStreamEvent, ToolDefinition } from "@/lib/ai/types"
import type { AIMessage } from "@/types"
import { toOpenAITools } from "@/lib/ai/tools/definitions"
import { SITE_CONFIG } from "@/lib/config"

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool"
  content?: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
}

// tool call ที่ถูกประกอบขึ้นจาก delta หลาย chunk ระหว่าง stream
// (LM Studio/OpenAI ส่ง name และ arguments มาเป็นชิ้นๆ ทีละ token)
interface StreamedToolCall {
  id: string
  name: string
  arguments: string
}

// event ภายในของ provider นี้เท่านั้น — เพิ่ม "round_done" เพื่อส่งสัญญาณจบ
// การ stream หนึ่งรอบ พร้อม tool call ที่ประกอบเสร็จแล้ว (ถ้ามี)
type InternalStreamEvent = AIStreamEvent | { type: "round_done"; toolCalls: StreamedToolCall[] }

export function createLMStudioProvider(): AIProvider {
  const baseUrl = SITE_CONFIG.ai.lmstudioBaseUrl.replace(/\/$/, "")
  const model = SITE_CONFIG.ai.lmstudioModel

  // เรียก /v1/chat/completions แบบ stream:true (OpenAI-compatible SSE ตามที่ LM Studio
  // รองรับ) — parse เป็น event "data: {...}\n\n" จนถึง "data: [DONE]"
  // อ้างอิง: https://lmstudio.ai/docs/app/api/endpoints/openai
  async function* streamRound(
    messages: OpenAIMessage[],
    tools: ToolDefinition[],
  ): AsyncGenerator<InternalStreamEvent> {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length > 0 ? toOpenAITools(tools) : undefined,
        stream: true,
      }),
    })
    if (!res.ok || !res.body) throw new Error(`LM Studio error: ${res.status}`)

    const toolCallsByIndex = new Map<number, StreamedToolCall>()
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

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
        if (!payload || payload === "[DONE]") continue

        let chunk: {
          choices?: Array<{
            delta?: {
              content?: string
              tool_calls?: Array<{
                index: number
                id?: string
                function?: { name?: string; arguments?: string }
              }>
            }
          }>
        }
        try {
          chunk = JSON.parse(payload)
        } catch {
          continue
        }

        const delta = chunk.choices?.[0]?.delta
        if (delta?.content) {
          yield { type: "content", text: delta.content }
        }

        for (const tc of delta?.tool_calls ?? []) {
          const existing = toolCallsByIndex.get(tc.index) ?? { id: "", name: "", arguments: "" }
          if (tc.id) existing.id = tc.id
          if (tc.function?.name) existing.name += tc.function.name
          if (tc.function?.arguments) existing.arguments += tc.function.arguments
          toolCallsByIndex.set(tc.index, existing)
        }
      }
    }

    yield { type: "round_done", toolCalls: [...toolCallsByIndex.values()] }
  }

  return {
    async *chatStream({ systemInstruction, messages, tools = [], onToolCall }) {
      const openaiMessages: OpenAIMessage[] = [
        { role: "system", content: systemInstruction },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]

      let loopCount = 0

      while (true) {
        let toolCalls: StreamedToolCall[] = []

        for await (const event of streamRound(openaiMessages, tools)) {
          if (event.type === "round_done") {
            toolCalls = event.toolCalls
          } else {
            yield event
          }
        }

        if (toolCalls.length === 0 || loopCount >= SITE_CONFIG.ai.maxToolCallLoops) {
          return
        }

        loopCount++
        openaiMessages.push({
          role: "assistant",
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.arguments },
          })),
        })

        for (const tc of toolCalls) {
          yield { type: "tool_call", name: tc.name }
          const args = JSON.parse(tc.arguments || "{}")
          const result = await onToolCall(tc.name, args)
          openaiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.name,
            content: JSON.stringify(result),
          })
        }
      }
    },
  }
}

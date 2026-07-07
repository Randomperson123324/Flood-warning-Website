import { GoogleGenAI, type FunctionDeclaration } from "@google/genai"
import type { AIProvider } from "@/lib/ai/types"
import { toGeminiTools } from "@/lib/ai/tools/definitions"
import { SITE_CONFIG } from "@/lib/config"

// ข้อความที่ส่งเข้า chat.sendMessageStream() — ตอนถามคำถามปกติเป็น string เดี่ยวๆ
// แต่ตอนส่งผลลัพธ์ tool กลับไปให้โมเดล ต้องเป็น array ของ functionResponse part
// อ้างอิง SDK: https://googleapis.github.io/js-genai/release_docs/classes/chats.Chat.html
type GeminiChatInput = string | Array<{ functionResponse: { name?: string; response: { result: unknown } } }>

export function createGeminiProvider(): AIProvider {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  return {
    async *chatStream({ systemInstruction, messages, tools = [], onToolCall }) {
      const geminiTools = toGeminiTools(tools)
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }))

      const chat = genai.chats.create({
        model: SITE_CONFIG.ai.model,
        config: {
          systemInstruction,
          tools: geminiTools as { functionDeclarations: FunctionDeclaration[] }[],
        },
        history,
      })

      let nextMessage: GeminiChatInput = messages[messages.length - 1]?.content ?? ""
      let loopCount = 0

      while (true) {
        const stream = await chat.sendMessageStream({ message: nextMessage })
        const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = []

        for await (const chunk of stream) {
          if (chunk.text) {
            yield { type: "content", text: chunk.text }
          }
          for (const call of chunk.functionCalls ?? []) {
            functionCalls.push({ name: call.name ?? "", args: (call.args ?? {}) as Record<string, unknown> })
          }
        }

        if (functionCalls.length === 0 || loopCount >= SITE_CONFIG.ai.maxToolCallLoops) {
          return
        }

        loopCount++
        const functionResponses: GeminiChatInput = []
        for (const call of functionCalls) {
          yield { type: "tool_call", name: call.name }
          const result = await onToolCall(call.name, call.args)
          functionResponses.push({ functionResponse: { name: call.name, response: { result } } })
        }

        nextMessage = functionResponses
      }
    },
  }
}

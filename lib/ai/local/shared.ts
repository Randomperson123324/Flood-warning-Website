"use client"

// ส่วนที่ใช้ร่วมกันระหว่างเอนจิน on-device ทั้งสองเส้นทาง:
//   engine.ts     = GPU (WebLLM / WebGPU)
//   cpu-engine.ts = CPU (wllama / WebAssembly)
// ทั้งคู่ดึง system prompt จาก /api/ai/context เหมือนกัน และคุยกับ UI ด้วย callback ชุดเดียวกัน

import type { AIContext } from "@/types"

export interface LocalStreamHandlers {
  onContent: (fullTextSoFar: string) => void
  onToolCall?: (label: string) => void
}

export interface LocalStreamLabels {
  fetchingContext: string
  loadingModel: string
  /** โชว์ระหว่างรอ token แรก — สำคัญกับเส้นทาง CPU ที่หน่วงเป็นสิบวินาที */
  thinking: string
}

// โมเดลของเส้นทาง CPU — ตรึงไว้ตัวเดียว (Qwen3 1.7B ตระกูลเดียวกับฝั่ง GPU)
// Q4_K_M = 1.1 GB ต่ำกว่าเพดาน ArrayBuffer 2 GB ของ WASM สบายๆ
// Apache 2.0 ไม่มี license gate จึงลิงก์ตรงจาก Hugging Face ได้ (CORS + range requests ผ่าน)
export const CPU_MODEL = {
  url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf",
  label: "Qwen3 1.7B",
  sizeText: "~1.1 GB",
  contextSize: 4096,
} as const

// prompt สำรองกรณีดึง /api/ai/context ไม่ได้ (เช่น offline) — ใช้ข้อมูล AIContext
// ที่มีอยู่แล้วฝั่ง client เพื่อให้โหมด on-device ยังตอบได้แม้ไม่มีเน็ต
export function buildFallbackSystemPrompt(context: AIContext): string {
  const trendText =
    context.trend === "rising" ? "กำลังสูงขึ้น" : context.trend === "falling" ? "กำลังลดลง" : "คงที่"
  return `
คุณคือ AI ผู้ช่วยวิเคราะห์สถานการณ์น้ำท่วม ประจำ ${context.sensorLabel}
ตอบเป็นภาษาไทย กระชับ ชัดเจน ห้ามแต่งข้อมูล

ขณะนี้ดึงข้อมูลสดจากเซิร์ฟเวอร์ไม่ได้ (อาจ offline) — ใช้ได้เฉพาะข้อมูลด้านล่างนี้
และต้องแจ้งผู้ใช้ว่าข้อมูลอาจไม่ใช่ค่าล่าสุด:
- ระดับน้ำ: ${context.currentLevel} cm
- เกณฑ์เตือนภัย: ${context.warningLevel} cm | เกณฑ์อันตราย: ${context.dangerLevel} cm
- แนวโน้ม: ${trendText} (${context.ratePerHour > 0 ? "+" : ""}${context.ratePerHour.toFixed(2)} cm/ชม.)
- รายงานน้ำท่วมที่ใช้งานอยู่: ${context.activeFloodReports} รายงาน

ห้ามอ้างว่าเรียกเครื่องมือหรือค้นข้อมูลเพิ่มได้
`.trim()
}

export async function fetchContextPrompt(context: AIContext): Promise<string> {
  const res = await fetch("/api/ai/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  })
  if (!res.ok) throw new Error(`context API error: ${res.status}`)
  const data = (await res.json()) as { systemPrompt?: string }
  if (!data.systemPrompt) throw new Error("context API returned no prompt")
  return data.systemPrompt
}

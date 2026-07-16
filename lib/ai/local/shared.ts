"use client"

// ส่วนที่ใช้ร่วมกันระหว่างเอนจิน on-device ทั้งสองเส้นทาง:
//   engine.ts     = GPU (WebLLM / WebGPU)
//   cpu-engine.ts = CPU (wllama / WebAssembly)
// ทั้งคู่ดึง system prompt จาก /api/ai/context เหมือนกัน และคุยกับ UI ด้วย callback ชุดเดียวกัน

import type { AIContext } from "@/types"

export interface LocalStreamHandlers {
  onContent: (fullTextSoFar: string) => void
  onToolCall?: (label: string) => void
  /** ข้อความ reasoning สะสม (ใน <think>...</think>) — เรียกเฉพาะตอนเปิดโหมดคิด */
  onThinking?: (thinkingTextSoFar: string) => void
}

export interface LocalStreamLabels {
  fetchingContext: string
  loadingModel: string
  /** โชว์ระหว่างรอ token แรก — สำคัญกับเส้นทาง CPU ที่หน่วงเป็นสิบวินาที */
  thinking: string
  /** โชว์ระหว่าง prefill พร้อม % (ประมาณการ — ดู trackPrefillProgress) */
  analyzingPrompt: string
  /** โชว์ระหว่างโมเดลกำลัง reasoning อยู่ใน <think> */
  thinkingStatus: string
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

// แยก reasoning block <think>...</think> ของ Qwen3 ออกจากคำตอบจริง
// รองรับแท็กที่ยังไม่ปิด (กำลัง stream อยู่) — ถือว่าทุกอย่างหลัง <think> เป็น reasoning
// แม้ปิดโหมดคิดแล้วโมเดลก็ยังใส่แท็กเปล่าๆ (<think>\n\n</think>) มาได้ในบางที
export function splitThinking(text: string): { thinking: string; answer: string; inThink: boolean } {
  const thinkingParts: string[] = []
  let answer = ""
  let rest = text
  let inThink = false
  while (true) {
    const open = rest.indexOf("<think>")
    if (open === -1) {
      answer += rest
      break
    }
    answer += rest.slice(0, open)
    rest = rest.slice(open + "<think>".length)
    const close = rest.indexOf("</think>")
    if (close === -1) {
      // ยังไม่ปิด — โมเดลกำลังคิดอยู่
      thinkingParts.push(rest)
      inThink = true
      break
    }
    thinkingParts.push(rest.slice(0, close))
    rest = rest.slice(close + "</think>".length)
  }
  return { thinking: thinkingParts.join("").trim(), answer: answer.replace(/^\s+/, ""), inThink }
}

const PREFILL_RATE_KEY = "streeflood:ai-prefill-rate"
// ไม่มีเอนจินไหนรายงานความคืบหน้า prefill จริงๆ (WebLLM/wllama ไม่มี event ให้)
// ค่าตั้งต้นเดาแบบกดต่ำไว้ก่อน (คืบเร็วกว่าคาดดีกว่าค้าง) — หลังรันครั้งแรก
// จะถูกแทนด้วยค่าที่วัดได้จริงของเครื่องนั้น
const DEFAULT_PREFILL_RATE = { gpu: 200, cpu: 10 } as const
// ภาษาไทย/อังกฤษปนกัน tokenizer ของ Qwen ตกราวๆ 3 ตัวอักษรต่อ token
const CHARS_PER_TOKEN = 3

/**
 * ประมาณความคืบหน้าช่วง prefill ("กำลังวิเคราะห์พรอมป์ X%") จากขนาดพรอมป์
 * กับอัตรา token/วินาที ที่วัดจากรอบก่อน (เก็บใน localStorage แยกตาม backend)
 * คืนฟังก์ชัน stop — เรียกตอนได้ token แรกเพื่อหยุด tick และบันทึกอัตราที่วัดได้จริง
 * ถ้าจบโดยไม่เคยได้ token (error/ยกเลิก) ให้เรียก stop(false) จะได้ไม่บันทึกอัตรามั่ว
 */
export function trackPrefillProgress(opts: {
  promptChars: number
  backend: "gpu" | "cpu"
  onTick: (pct: number) => void
}): (recordRate?: boolean) => void {
  const rateKey = `${PREFILL_RATE_KEY}:${opts.backend}`
  let rate: number = DEFAULT_PREFILL_RATE[opts.backend]
  try {
    const stored = Number(window.localStorage.getItem(rateKey))
    if (Number.isFinite(stored) && stored > 0) rate = stored
  } catch {
    // localStorage ใช้ไม่ได้ (เช่นโหมดส่วนตัวบางเบราว์เซอร์) — ใช้ค่าตั้งต้นไป
  }

  const estTokens = Math.max(1, opts.promptChars / CHARS_PER_TOKEN)
  const expectedMs = (estTokens / rate) * 1000
  const startedAt = Date.now()

  opts.onTick(0)
  const interval = setInterval(() => {
    // เส้นตรงถึง 85% ตามเวลาที่คาด จากนั้นไต่เข้าหา 99 แบบ asymptote — ต่อให้
    // เครื่องช้ากว่าที่เดาไว้มาก ตัวเลขก็ยังขยับให้เห็นเรื่อยๆ ไม่นิ่งค้างที่ 99
    const linear = (Date.now() - startedAt) / expectedMs
    const pct = linear <= 0.85 ? linear * 100 : 85 + 14 * (1 - Math.exp(-(linear - 0.85) / 1.5))
    opts.onTick(Math.min(99, Math.round(pct)))
  }, 250)

  let stopped = false
  return (recordRate = true) => {
    if (stopped) return
    stopped = true
    clearInterval(interval)
    if (!recordRate) return
    const elapsedSec = (Date.now() - startedAt) / 1000
    // เร็วกว่า 0.2 วิ วัดอัตราไม่เที่ยง (โดน cache/พรอมป์สั้น) — ไม่อัปเดตค่า
    if (elapsedSec < 0.2) return
    try {
      window.localStorage.setItem(rateKey, String(estTokens / elapsedSec))
    } catch {
      // เก็บไม่ได้ก็แค่เสียการปรับตัว ครั้งหน้าใช้ค่าตั้งต้นเหมือนเดิม
    }
  }
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

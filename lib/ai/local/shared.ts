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
  /** จำนวน hidden layer ของ Qwen3-1.7B — เพดานของ n_gpu_layers (GPU offload) */
  layerCount: 28,
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

const PREFILL_CAL_KEY = "streeflood:ai-prefill-cal"
// ค่าตั้งต้นก่อนมีข้อมูลวัดจริง — กดอัตราต่ำไว้ก่อน (คืบเร็วกว่าคาดดีกว่าค้าง)
// charsPerToken: ไทย/อังกฤษปนกัน tokenizer ของ Qwen ตกราวๆ 3 ตัวอักษรต่อ token
const DEFAULT_CAL = {
  gpu: { rate: 200, charsPerToken: 3 },
  cpu: { rate: 10, charsPerToken: 3 },
} as const

export interface PrefillCalibration {
  /** token/วินาที ช่วง prefill ที่วัดได้จริงของเครื่องนี้ */
  rate: number
  /** ตัวอักษรต่อ token ที่วัดจากพรอมป์จริง — ใช้แปลงความยาวข้อความเป็นจำนวน token */
  charsPerToken: number
}

/** ค่าที่เคยวัดได้จริงของ backend นี้ — null ถ้ายังไม่เคยรันเลย */
export function getPrefillCalibration(backend: "gpu" | "cpu"): PrefillCalibration | null {
  try {
    const raw = window.localStorage.getItem(`${PREFILL_CAL_KEY}:${backend}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PrefillCalibration>
    if (
      typeof parsed.rate === "number" && Number.isFinite(parsed.rate) && parsed.rate > 0 &&
      typeof parsed.charsPerToken === "number" && Number.isFinite(parsed.charsPerToken) && parsed.charsPerToken > 0
    ) {
      return { rate: parsed.rate, charsPerToken: parsed.charsPerToken }
    }
  } catch {
    // localStorage ใช้ไม่ได้ / ข้อมูลเพี้ยน — ถือว่าไม่เคยวัด
  }
  return null
}

export function recordPrefillCalibration(backend: "gpu" | "cpu", update: Partial<PrefillCalibration>): void {
  const rate = update.rate && Number.isFinite(update.rate) && update.rate > 0 ? update.rate : undefined
  const charsPerToken =
    update.charsPerToken && Number.isFinite(update.charsPerToken) && update.charsPerToken > 0
      ? update.charsPerToken
      : undefined
  if (!rate && !charsPerToken) return
  const current = getPrefillCalibration(backend) ?? DEFAULT_CAL[backend]
  const next: PrefillCalibration = {
    rate: rate ?? current.rate,
    charsPerToken: charsPerToken ?? current.charsPerToken,
  }
  try {
    window.localStorage.setItem(`${PREFILL_CAL_KEY}:${backend}`, JSON.stringify(next))
  } catch {
    // เก็บไม่ได้ก็แค่เสียการปรับตัว ครั้งหน้าใช้ค่าตั้งต้นเหมือนเดิม
  }
}

/** จุดคืบหน้าจริงจากเอนจิน — รูปเดียวกับ prompt_progress ของ llama.cpp server */
export interface PrefillAnchor {
  total: number
  cache: number
  processed: number
  time_ms: number
}

export interface PrefillProgressHandle {
  /**
   * ป้อนจุดคืบหน้าจริง (เส้นทาง CPU: wllama ส่ง prompt_progress มาทุก batch)
   * ตัวนับจะเปลี่ยนจากโหมดประมาณการเป็นตามจุดจริง + extrapolate ระหว่างจุด
   */
  anchor: (real: PrefillAnchor) => void
  /** token แรกออกแล้ว — หยุด tick และบันทึกคาลิเบรชันไว้ใช้ประมาณครั้งถัดไป */
  done: () => void
  /** จบโดยไม่เคยได้ token (error/ยกเลิก) — หยุดเฉยๆ ห้ามบันทึกค่ามั่ว */
  cancel: () => void
}

/**
 * ความคืบหน้าช่วง prefill ("กำลังวิเคราะห์พรอมป์ X%")
 * - มีข้อมูลจริง (anchor จาก wllama): % คิดจากจำนวน token ที่ประมวลผลแล้วจริงๆ
 *   และ extrapolate ต่อระหว่างรอ batch ถัดไปด้วยอัตราที่วัดจาก batch ก่อนหน้า
 * - ไม่มี (WebLLM ไม่ส่ง event): ประมาณจากขนาดพรอมป์ + อัตราที่วัดได้รอบก่อน
 *   (เก็บใน localStorage แยกตาม backend) — เส้นตรงถึง 85% แล้วไต่เข้า 99 แบบ asymptote
 */
export function trackPrefillProgress(opts: {
  promptChars: number
  backend: "gpu" | "cpu"
  onTick: (pct: number) => void
}): PrefillProgressHandle {
  const cal = getPrefillCalibration(opts.backend) ?? DEFAULT_CAL[opts.backend]
  const estTokens = Math.max(1, opts.promptChars / cal.charsPerToken)
  const expectedMs = (estTokens / cal.rate) * 1000
  const startedAt = Date.now()

  // จุดจริงล่าสุด + อัตรา %/ms ที่วัดระหว่างสองจุดล่าสุด (ไว้ extrapolate)
  let last: { pct: number; at: number; pctPerMs: number; real: PrefillAnchor } | null = null

  const currentPct = () => {
    const now = Date.now()
    if (last) return last.pct + (now - last.at) * last.pctPerMs
    const linear = (now - startedAt) / expectedMs
    return linear <= 0.85 ? linear * 100 : 85 + 14 * (1 - Math.exp(-(linear - 0.85) / 1.5))
  }

  opts.onTick(0)
  const interval = setInterval(() => opts.onTick(Math.min(99, Math.round(currentPct()))), 250)

  let stopped = false
  const stop = () => {
    stopped = true
    clearInterval(interval)
  }

  return {
    anchor: (real) => {
      if (stopped || real.total <= 0) return
      const now = Date.now()
      const donePct = ((real.cache + real.processed) / real.total) * 100
      const prev = last
      // อัตราจากช่วงระหว่างจุดล่าสุด (เวลาจริงฝั่งเรา) — ยังไม่มีสองจุดก็ใช้อัตราคาลิเบรต
      const pctPerMs =
        prev && donePct > prev.pct && now > prev.at
          ? (donePct - prev.pct) / (now - prev.at)
          : (cal.rate / 1000 / real.total) * 100
      last = { pct: donePct, at: now, pctPerMs, real }
      opts.onTick(Math.min(99, Math.round(donePct)))
    },
    done: () => {
      if (stopped) return
      stop()
      if (last && last.real.processed > 0 && last.real.time_ms > 0) {
        // มีตัวเลขที่เอนจินวัดเองครบ — ทั้งอัตราและจำนวน token จริงของพรอมป์นี้
        recordPrefillCalibration(opts.backend, {
          rate: (last.real.processed / last.real.time_ms) * 1000,
          charsPerToken: opts.promptChars / last.real.total,
        })
        return
      }
      const elapsedSec = (Date.now() - startedAt) / 1000
      // เร็วกว่า 0.2 วิ วัดอัตราไม่เที่ยง (โดน cache/พรอมป์สั้น) — ไม่อัปเดตค่า
      if (elapsedSec < 0.2) return
      recordPrefillCalibration(opts.backend, { rate: estTokens / elapsedSec })
    },
    cancel: stop,
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

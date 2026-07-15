"use client"

// จัดการ WebLLM engine ฝั่ง client (singleton) — โหลดโมเดลลง Web Worker ผ่าน WebGPU
// ทุก runtime import ของ @mlc-ai/web-llm เป็น dynamic import เพื่อไม่ให้ไลบรารี
// (~5 MB) หลุดเข้า initial bundle ของผู้ใช้ที่เลือก cloud AI และไม่โดน SSR แตะเลย

import type { AIContext } from "@/types"

type WebLLM = typeof import("@mlc-ai/web-llm")
type Engine = import("@mlc-ai/web-llm").WebWorkerMLCEngine

export interface LocalStreamHandlers {
  onContent: (fullTextSoFar: string) => void
  onToolCall?: (label: string) => void
}

export interface LocalStreamLabels {
  fetchingContext: string
  loadingModel: string
}

let webllmPromise: Promise<WebLLM> | null = null
let enginePromise: Promise<Engine> | null = null
let loadedModelId: string | null = null
let worker: Worker | null = null
// WebLLM รัน generation ได้ทีละงาน — ใช้ promise queue กันกรณี AI chat ลอย
// กับ community /AI ยิงพร้อมกัน
let generationQueue: Promise<unknown> = Promise.resolve()

function loadWebLLM(): Promise<WebLLM> {
  webllmPromise ??= import("@mlc-ai/web-llm")
  return webllmPromise
}

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as Navigator & { gpu?: unknown }).gpu
}

export async function getEngine(
  modelId: string,
  onProgress?: (progress: number, text: string) => void,
): Promise<Engine> {
  const webllm = await loadWebLLM()

  if (enginePromise) {
    const engine = await enginePromise
    if (loadedModelId !== modelId) {
      loadedModelId = modelId
      await engine.reload(modelId)
    }
    return engine
  }

  worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" })
  loadedModelId = modelId
  enginePromise = webllm.CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (report) => onProgress?.(report.progress, report.text),
  })
  try {
    return await enginePromise
  } catch (err) {
    // init ล้ม (GPU ไม่พอ / โหลดขาด) — เคลียร์ singleton ให้กดลองใหม่ได้
    await unloadEngine()
    throw err
  }
}

export function isEngineLoaded(): boolean {
  return enginePromise !== null
}

export async function unloadEngine(): Promise<void> {
  const pending = enginePromise
  enginePromise = null
  loadedModelId = null
  try {
    const engine = await pending
    await engine?.unload()
  } catch {
    // engine ที่ init ไม่สำเร็จ ไม่มีอะไรให้ unload
  }
  worker?.terminate()
  worker = null
}

export async function hasModelCached(modelId: string): Promise<boolean> {
  if (!isWebGPUAvailable()) return false
  const webllm = await loadWebLLM()
  return webllm.hasModelInCache(modelId)
}

export async function deleteModel(modelId: string): Promise<void> {
  await unloadEngine()
  const webllm = await loadWebLLM()
  await webllm.deleteModelAllInfoInCache(modelId)
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null
  const { usage, quota } = await navigator.storage.estimate()
  return { usage: usage ?? 0, quota: quota ?? 0 }
}

export async function interrupt(): Promise<void> {
  if (!enginePromise) return
  const engine = await enginePromise
  engine.interruptGenerate()
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = generationQueue.then(fn, fn)
  generationQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

// prompt สำรองกรณีดึง /api/ai/context ไม่ได้ (เช่น offline) — ใช้ข้อมูล AIContext
// ที่มีอยู่แล้วฝั่ง client เพื่อให้โหมด on-device ยังตอบได้แม้ไม่มีเน็ต
function buildFallbackSystemPrompt(context: AIContext): string {
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

async function fetchContextPrompt(context: AIContext): Promise<string> {
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

// คู่แฝดของ streamAIReply ใน hooks/use-ai-chat.ts — สัญญา callback เดียวกันเป๊ะ
// (onContent รับข้อความสะสมทั้งก้อน, onToolCall รับ label สถานะชั่วคราว)
export async function streamLocalReply(
  messages: { role: "user" | "assistant"; content: string }[],
  context: AIContext,
  handlers: LocalStreamHandlers,
  opts: { modelId: string; labels: LocalStreamLabels },
): Promise<string> {
  handlers.onToolCall?.(opts.labels.fetchingContext)
  let systemPrompt: string
  try {
    systemPrompt = await fetchContextPrompt(context)
  } catch {
    systemPrompt = buildFallbackSystemPrompt(context)
  }

  const engine = await getEngine(opts.modelId, (progress, _text) => {
    handlers.onToolCall?.(`${opts.labels.loadingModel} ${Math.round(progress * 100)}%`)
  })

  return enqueue(async () => {
    const chunks = await engine.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      temperature: 0.6,
      max_tokens: 1024,
      // Qwen3 เป็นโมเดล hybrid thinking — ปิด <think> เพื่อให้ตอบเร็วและ
      // ไม่มี reasoning หลุดมาในแชท (รองรับใน web-llm >= 0.2.80)
      extra_body: { enable_thinking: false },
    })

    let fullText = ""
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content ?? ""
      if (delta) {
        fullText += delta
        handlers.onContent(fullText)
      }
    }
    return fullText
  })
}

"use client"

// จัดการ WebLLM engine ฝั่ง client (singleton) — โหลดโมเดลลง Web Worker ผ่าน WebGPU
// ทุก runtime import ของ @mlc-ai/web-llm เป็น dynamic import เพื่อไม่ให้ไลบรารี
// (~5 MB) หลุดเข้า initial bundle ของผู้ใช้ที่เลือก cloud AI และไม่โดน SSR แตะเลย

import type { AIContext } from "@/types"
import { F32_FALLBACKS } from "./models"

import { buildFallbackSystemPrompt, fetchContextPrompt } from "./shared"
import type { LocalStreamHandlers, LocalStreamLabels } from "./shared"

type WebLLM = typeof import("@mlc-ai/web-llm")
type Engine = import("@mlc-ai/web-llm").WebWorkerMLCEngine

export type { LocalStreamHandlers, LocalStreamLabels }

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

let f16SupportPromise: Promise<boolean> | null = null

// GPU/driver บางตัวไม่มี WebGPU feature "shader-f16" — โมเดล q4f16 จะ compile shader
// ไม่ผ่าน (GPUValidationError: extension 'f16' is not allowed) หลังดาวน์โหลดเสร็จ
export function supportsShaderF16(): Promise<boolean> {
  f16SupportPromise ??= (async () => {
    try {
      type GPULike = { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> }
      const gpu = (navigator as Navigator & { gpu?: GPULike }).gpu
      const adapter = await gpu?.requestAdapter()
      return adapter?.features.has("shader-f16") ?? false
    } catch {
      return false
    }
  })()
  return f16SupportPromise
}

// สลับไปรุ่น q4f32 อัตโนมัติถ้าเครื่องไม่รองรับ f16 — เรียกที่นี่ (จุดเดียวก่อนสร้าง engine)
// กันเคส caller ส่ง id รุ่น f16 มาก่อนที่ตัวตรวจฝั่ง UI จะ resolve ทัน
export async function resolveModelId(modelId: string): Promise<string> {
  const fallback = F32_FALLBACKS[modelId]
  if (!fallback) return modelId
  return (await supportsShaderF16()) ? modelId : fallback.id
}

export async function getEngine(
  requestedModelId: string,
  onProgress?: (progress: number, text: string) => void,
): Promise<Engine> {
  const modelId = await resolveModelId(requestedModelId)
  const webllm = await loadWebLLM()

  if (enginePromise) {
    const engine = await enginePromise
    if (loadedModelId !== modelId) {
      // อัปเดต loadedModelId หลัง reload สำเร็จเท่านั้น — ถ้า reload ล้ม (เช่น VRAM
      // ไม่พอสำหรับโมเดลใหม่) ครั้งถัดไปต้องลอง reload ใหม่ ไม่ใช่คืน engine ค้างสภาพ
      loadedModelId = null
      await engine.reload(modelId)
      loadedModelId = modelId
    }
    return engine
  }

  // ห้ามใส่ { type: "module" } — Next ไม่ได้เปิด experiments.outputModule webpack จึงปล่อย
  // worker chunk เป็นแบบ classic ที่ bootstrap ด้วย importScripts() ซึ่งไม่มีใน module worker
  // (worker ตายทันทีที่บูตด้วย "Module scripts don't support importScripts()")
  worker = new Worker(new URL("./webllm.worker.ts", import.meta.url))
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

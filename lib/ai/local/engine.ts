"use client"

// จัดการ WebLLM engine ฝั่ง client (singleton) — โหลดโมเดลผ่าน WebGPU บน main thread
// ทุก runtime import ของ @mlc-ai/web-llm เป็น dynamic import เพื่อไม่ให้ไลบรารี
// (~5 MB) หลุดเข้า initial bundle ของผู้ใช้ที่เลือก cloud AI และไม่โดน SSR แตะเลย
//
// ทำไมไม่ใช้ Web Worker: worker ที่โหลดสคริปต์ผ่าน network ต้องให้ response ของสคริปต์
// ประกาศ COEP เองด้วย (สเปก "check a global object's embedder policy") ไม่งั้นหน้าที่เปิด
// cross-origin isolation จะสร้าง worker ไม่ได้เลย — และเวลาโดนบล็อก WebLLM จะค้างรอ
// ข้อความตอบจาก worker ตลอดไป ไม่ throw ทำให้ UI ค้างที่ 0% โดยไม่มี error ให้เห็น
// main thread ไม่ต้องโหลดสคริปต์ข้ามชั้นแบบนั้น จึงไม่ผูกกับ header ของ host เลย
// เหมือนเส้นทาง CPU (wllama) ที่สร้าง worker จาก blob URL จึงไม่เคยโดน COEP
//
// แลกมาด้วย: inference รันบน main thread — WebGPU เป็น async อยู่แล้วจึงไม่ถึงกับค้าง
// แต่ระหว่าง generate UI จะกระตุกกว่าตอนใช้ worker

import type { AIContext } from "@/types"
import { F32_FALLBACKS } from "./models"

import {
  buildBareSystemPrompt,
  buildFallbackSystemPrompt,
  fetchContextPrompt,
  recordPrefillCalibration,
  splitThinking,
  trackPrefillProgress,
} from "./shared"
import type { LocalStreamHandlers, LocalStreamLabels } from "./shared"

type WebLLM = typeof import("@mlc-ai/web-llm")
type Engine = import("@mlc-ai/web-llm").MLCEngine

export type { LocalStreamHandlers, LocalStreamLabels }

let webllmPromise: Promise<WebLLM> | null = null
let enginePromise: Promise<Engine> | null = null
let loadedModelId: string | null = null
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

export interface WebGpuInfo {
  vendor: string
  architecture: string
  f16: boolean
  /** เพดานขนาด buffer ต่อก้อน (ไบต์) — ตัวชี้วัด VRAM ที่เบราว์เซอร์ยอมให้ใช้จริง
   * (WebGPU ไม่มีทางเลือก dedicated/shared memory — ไดรเวอร์จัดการเองทั้งหมด) */
  maxBufferBytes: number
}

let gpuInfoPromise: Promise<WebGpuInfo | null> | null = null

/** ข้อมูล adapter ของการ์ดจอ (vendor/สถาปัตยกรรม/f16) — null = ไม่มี adapter ใช้ได้ */
export function getWebGpuInfo(): Promise<WebGpuInfo | null> {
  gpuInfoPromise ??= (async () => {
    try {
      type AdapterLike = {
        features: ReadonlySet<string>
        info?: { vendor?: string; architecture?: string }
        limits?: { maxBufferSize?: number }
      }
      type GPULike = { requestAdapter(): Promise<AdapterLike | null> }
      const gpu = (navigator as Navigator & { gpu?: GPULike }).gpu
      const adapter = await gpu?.requestAdapter()
      if (!adapter) return null
      return {
        vendor: adapter.info?.vendor ?? "",
        architecture: adapter.info?.architecture ?? "",
        f16: adapter.features.has("shader-f16"),
        maxBufferBytes: adapter.limits?.maxBufferSize ?? 0,
      }
    } catch {
      return null
    }
  })()
  return gpuInfoPromise
}

// navigator.gpu มีอยู่ไม่ได้แปลว่าใช้ได้จริง — บางเครื่อง requestAdapter คืน null
// (การ์ดโดน blocklist / ตัว render เป็นซอฟต์แวร์) ต้องเช็คถึงระดับ adapter
export function hasWebGpuAdapter(): Promise<boolean> {
  return getWebGpuInfo().then((info) => info !== null)
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

  loadedModelId = modelId
  enginePromise = webllm.CreateMLCEngine(modelId, {
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
  opts: { modelId: string; labels: LocalStreamLabels; thinking?: boolean; includeContext?: boolean },
): Promise<string> {
  let systemPrompt: string
  if (opts.includeContext === false) {
    // ผู้ใช้ปิด "ส่งข้อมูลเว็บให้ AI" — prompt เปล่าสั้นๆ prefill แทบทันที
    systemPrompt = buildBareSystemPrompt()
  } else {
    handlers.onToolCall?.(opts.labels.fetchingContext)
    try {
      systemPrompt = await fetchContextPrompt(context)
    } catch {
      systemPrompt = buildFallbackSystemPrompt(context)
    }
  }

  const engine = await getEngine(opts.modelId, (progress, _text) => {
    const pct = Math.round(progress * 100)
    // progress 100% = อ่านไฟล์ครบแล้ว แต่ยังยัดเข้า GPU/คอมไพล์ shader อยู่ (ไม่มี progress)
    handlers.onToolCall?.(pct >= 100 ? opts.labels.preparingModel : `${opts.labels.loadingModel} ${pct}%`)
  })

  return enqueue(async () => {
    const promptChars = systemPrompt.length + messages.reduce((n, m) => n + m.content.length, 0)
    // WebLLM ไม่มี event ความคืบหน้า prefill แบบ wllama — ใช้ตัวประมาณจากคาลิเบรชัน
    // แล้วค่อยบันทึกสถิติที่ WebLLM วัดจริง (usage.extra) ตอนจบ stream ไว้ใช้รอบหน้า
    const prefill = trackPrefillProgress({
      promptChars,
      backend: "gpu",
      onTick: (pct) => handlers.onToolCall?.(`${opts.labels.analyzingPrompt} ${pct}%`),
    })
    try {
      const chunks = await engine.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.6,
        // เปิดโหมดคิดต้องเผื่อ budget ให้ reasoning ไม่กิน max_tokens จนคำตอบขาด
        max_tokens: opts.thinking ? 2048 : 1024,
        // Qwen3 เป็นโมเดล hybrid thinking — เปิด/ปิด <think> ตาม toggle ของผู้ใช้
        // (รองรับใน web-llm >= 0.2.80)
        extra_body: { enable_thinking: !!opts.thinking },
      })

      let fullText = ""
      for await (const chunk of chunks) {
        // chunk สุดท้าย (include_usage) แบกสถิติที่วัดจริง — เก็บเป็นคาลิเบรชันรอบหน้า
        if (chunk.usage) {
          recordPrefillCalibration("gpu", {
            rate: chunk.usage.extra.prefill_tokens_per_s > 0 ? chunk.usage.extra.prefill_tokens_per_s : undefined,
            decodeRate: chunk.usage.extra.decode_tokens_per_s > 0 ? chunk.usage.extra.decode_tokens_per_s : undefined,
            // WebLLM นับ prompt_tokens เฉพาะส่วนใหม่เมื่อคุยต่อเนื่อง — อัตราส่วน
            // ตัวอักษร/token จึงคำนวณได้เฉพาะรอบที่พรอมป์ทั้งก้อนถูกประมวลผล (ข้อความแรก)
            charsPerToken:
              messages.length === 1 && chunk.usage.prompt_tokens > 0
                ? promptChars / chunk.usage.prompt_tokens
                : undefined,
          })
        }
        const delta = chunk.choices[0]?.delta?.content ?? ""
        if (!delta) continue
        if (!fullText) prefill.done()
        fullText += delta
        const { thinking, answer, inThink } = splitThinking(fullText)
        if (thinking) handlers.onThinking?.(thinking)
        if (answer) {
          handlers.onContent(answer)
        } else {
          // ยังไม่มีคำตอบให้โชว์ — บอกสถานะว่ากำลังคิด (ใน <think>) หรือกำลังพิมพ์
          handlers.onToolCall?.(opts.thinking && inThink ? opts.labels.thinkingStatus : opts.labels.thinking)
        }
      }
      return splitThinking(fullText).answer
    } finally {
      // มาถึงตรงนี้โดยยังไม่เคยได้ token (error/ยกเลิก) — หยุด tick เฉยๆ ห้ามบันทึกค่า
      prefill.cancel()
    }
  })
}

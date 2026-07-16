"use client"

// เอนจิน on-device แบบ CPU (wllama = llama.cpp คอมไพล์เป็น WebAssembly)
// คู่กับ engine.ts ที่เป็นฝั่ง GPU (WebLLM/WebGPU) — สัญญา callback เดียวกันเป๊ะ
//
// ทำไมต้องมี: GPU เก่าอย่าง Radeon 530 มี VRAM แค่ ~2 GB และไม่มี shader-f16
// รันโมเดลผ่าน WebGPU ไม่ได้ (ดู engine.ts) แต่เครื่องพวกนี้มักมี RAM 8 GB+
// เส้นทาง CPU เลยใช้ RAM แทน VRAM — ช้ากว่ามาก แต่ทำงานได้ทุกเครื่อง ไม่ต้องมี GPU
//
// import ของ @wllama/wllama เป็น dynamic ทั้งหมด เพื่อไม่ให้หลุดเข้า initial bundle
// ของผู้ใช้ที่ใช้ cloud/GPU และไม่โดน SSR แตะ

import type { AIContext } from "@/types"
import { CPU_MODEL, buildFallbackSystemPrompt, fetchContextPrompt } from "./shared"
import type { LocalStreamHandlers, LocalStreamLabels } from "./shared"

// import ชี้ตรงไปที่ build ESM ของ wllama เพราะ package.json (3.5.1) ตั้ง main เป็น
// "index.js" ที่ไม่มีอยู่จริง และไม่มี field types/exports — ถ้า import ชื่อแพ็กเกจเฉยๆ
// TypeScript จะถอยไปอ่าน index.ts ที่เป็น source แล้วพังด้วย BigInt literal (target ES2017)
type WllamaModule = typeof import("@wllama/wllama/esm/index.js")
type WllamaInstance = import("@wllama/wllama/esm/index.js").Wllama

// wasm ถูก copy ไว้ที่ public/wllama/ ตอน build (ดู scripts ใน package.json)
// wllama เลือก single/multi-thread เองตาม crossOriginIsolated ของหน้านั้นๆ
const WASM_PATHS = { default: "/wllama/wllama.wasm" }

let modulePromise: Promise<WllamaModule> | null = null
let instancePromise: Promise<WllamaInstance> | null = null
// llama.cpp context เดียวรัน generation ได้ทีละงาน — queue กันชนเหมือนฝั่ง GPU
let generationQueue: Promise<unknown> = Promise.resolve()

function loadWllama(): Promise<WllamaModule> {
  modulePromise ??= import("@wllama/wllama/esm/index.js")
  return modulePromise
}

// เส้นทาง CPU ใช้ได้ทุกที่ที่มี WebAssembly — ไม่มีเงื่อนไข GPU
// (multi-thread ต้อง crossOriginIsolated แต่ single-thread ก็ยังรันได้)
export function isCpuEngineAvailable(): boolean {
  return typeof WebAssembly !== "undefined"
}

/** true = หน้านี้ cross-origin isolated → wllama ใช้ multi-thread ได้ (เร็วกว่ามาก) */
export function isCpuMultithreadAvailable(): boolean {
  return typeof globalThis !== "undefined" && !!(globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated
}

export async function getCpuEngine(
  onProgress?: (progress: number, text: string) => void,
): Promise<WllamaInstance> {
  if (instancePromise) return instancePromise

  instancePromise = (async () => {
    const { Wllama, LoggerWithoutDebug } = await loadWllama()
    const wllama = new Wllama(WASM_PATHS, {
      logger: LoggerWithoutDebug,
      // โมเดลถูก cache ไว้แล้วให้ใช้ได้ตอน offline (จุดขายของโหมด on-device)
      allowOffline: true,
      parallelDownloads: 3,
    })

    await wllama.loadModelFromUrl(CPU_MODEL.url, {
      n_ctx: CPU_MODEL.contextSize,
      // 0 = ไม่ offload ชั้นไหนขึ้น GPU เลย — เส้นทางนี้ตั้งใจให้รันบน CPU/RAM ล้วน
      // (wllama 3.x เปิด WebGPU อัตโนมัติ ซึ่งจะพาไปเจอปัญหา VRAM เดิมของ engine.ts)
      n_gpu_layers: 0,
      // ใช้ jinja template ที่ติดมากับ GGUF — Qwen3 ต้องใช้เพื่อจัดรูปแบบ chat ให้ถูก
      // (รวมถึงให้ soft switch /no_think ในพรอมป์ทำงาน — ดู streamCpuReply)
      jinja: true,
      useCache: true,
      progressCallback: ({ loaded, total }) => {
        onProgress?.(total > 0 ? loaded / total : 0, "downloading")
      },
    })
    return wllama
  })()

  try {
    return await instancePromise
  } catch (err) {
    // init ล้ม (RAM ไม่พอ / โหลดขาด) — เคลียร์ singleton ให้กดลองใหม่ได้
    await unloadCpuEngine()
    throw err
  }
}

export function isCpuEngineLoaded(): boolean {
  return instancePromise !== null
}

export async function unloadCpuEngine(): Promise<void> {
  const pending = instancePromise
  instancePromise = null
  try {
    const wllama = await pending
    await wllama?.exit()
  } catch {
    // instance ที่ init ไม่สำเร็จ ไม่มีอะไรให้ปิด
  }
}

export async function hasCpuModelCached(): Promise<boolean> {
  try {
    const { ModelManager } = await loadWllama()
    const manager = new ModelManager()
    const models = await manager.getModels()
    return models.some((m) => m.url === CPU_MODEL.url)
  } catch {
    return false
  }
}

export async function deleteCpuModel(): Promise<void> {
  await unloadCpuEngine()
  const { ModelManager } = await loadWllama()
  const manager = new ModelManager()
  const models = await manager.getModels({ includeInvalid: true })
  for (const model of models) {
    if (model.url === CPU_MODEL.url) await model.remove()
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = generationQueue.then(fn, fn)
  generationQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

// ตัด reasoning block <think>...</think> ของ Qwen3 ออกจากข้อความที่จะโชว์
// แม้สั่ง /no_think แล้วโมเดลก็ยังใส่แท็กเปล่าๆ (<think>\n\n</think>) มาได้ในบางที
// รับ text สะสมทั้งก้อน (streaming) แล้วคืนเฉพาะส่วนที่เป็นคำตอบจริง
function stripThinking(text: string): string {
  const withoutClosed = text.replace(/<think>[\s\S]*?<\/think>/g, "")
  // แท็ก <think> ที่ยังไม่ปิด (กำลัง stream อยู่) → ซ่อนตั้งแต่ตรงนั้นจนกว่าจะเจอ </think>
  const open = withoutClosed.indexOf("<think>")
  return (open === -1 ? withoutClosed : withoutClosed.slice(0, open)).replace(/^\s+/, "")
}

// คู่แฝดของ streamLocalReply (engine.ts) — สัญญาเดียวกัน แต่รันบน CPU
export async function streamCpuReply(
  messages: { role: "user" | "assistant"; content: string }[],
  context: AIContext,
  handlers: LocalStreamHandlers,
  opts: { labels: LocalStreamLabels },
): Promise<string> {
  handlers.onToolCall?.(opts.labels.fetchingContext)
  let systemPrompt: string
  try {
    systemPrompt = await fetchContextPrompt(context)
  } catch {
    systemPrompt = buildFallbackSystemPrompt(context)
  }

  const wllama = await getCpuEngine((progress) => {
    handlers.onToolCall?.(`${opts.labels.loadingModel} ${Math.round(progress * 100)}%`)
  })

  return enqueue(async () => {
    handlers.onToolCall?.(opts.labels.thinking)
    // Qwen3 เป็นโมเดล hybrid thinking — ปิดโหมดคิดด้วย soft switch /no_think ต่อท้าย
    // system prompt (เป็น token ที่โมเดลถูกเทรนมาให้รู้จัก ไม่ผ่าน template variable)
    // ทำไมไม่ใช้ chat_template_kwargs enable_thinking=false: wllama ส่ง kwarg ข้ามไป
    // wasm เป็น "อาร์เรย์ของ string" (ดู glue arr_str) ค่า false เลยกลายเป็น "false"
    // ซึ่งใน Jinja ถือเป็น truthy → โหมดคิดไม่ปิดจริง
    const chunks = await wllama.createChatCompletion({
      messages: [{ role: "system", content: `${systemPrompt}\n\n/no_think` }, ...messages],
      stream: true,
      temperature: 0.6,
      max_tokens: 1024,
    })

    let fullText = ""
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content ?? ""
      if (delta) {
        fullText += delta
        handlers.onContent(stripThinking(fullText))
      }
    }
    return stripThinking(fullText)
  })
}

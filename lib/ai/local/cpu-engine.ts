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
import { hasWebGpuAdapter, supportsShaderF16 } from "./engine"
import { CPU_MODEL, buildFallbackSystemPrompt, fetchContextPrompt, splitThinking, trackPrefillProgress } from "./shared"
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
// จำนวนเลเยอร์ที่ instance ปัจจุบันโหลดไว้บน GPU — ไว้เทียบว่าต้องโหลดใหม่ไหม
let loadedGpuLayers: number | null = null
// llama.cpp context เดียวรัน generation ได้ทีละงาน — queue กันชนเหมือนฝั่ง GPU
let generationQueue: Promise<unknown> = Promise.resolve()

// GPU offload แบบ LM Studio: แบ่งบางเลเยอร์ของโมเดลไปรันบนการ์ดจอผ่าน WebGPU
// เร็วขึ้นตามจำนวนเลเยอร์ แต่กิน VRAM — ผู้ใช้ปรับได้ใน "ตัวเลือกขั้นสูง"
const GPU_OFFLOAD_KEY = "streeflood:ai-gpu-offload"

/** ค่าที่ผู้ใช้ตั้งเอง — null = ยังไม่เคยตั้ง (ใช้ค่าอัตโนมัติ) */
export function getStoredGpuOffload(): number | null {
  try {
    const raw = window.localStorage.getItem(GPU_OFFLOAD_KEY)
    if (raw === null) return null
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 && n <= CPU_MODEL.layerCount ? n : null
  } catch {
    return null
  }
}

export function setStoredGpuOffload(layers: number): void {
  try {
    window.localStorage.setItem(GPU_OFFLOAD_KEY, String(layers))
  } catch {
    // เก็บไม่ได้ก็ใช้ค่าอัตโนมัติต่อไป
  }
}

/**
 * จำนวนเลเยอร์ที่จะ offload จริง: ค่าที่ผู้ใช้ตั้ง หรือค่าอัตโนมัติแบบระวัง VRAM
 * (ทำนอง auto ของ LM Studio แต่เบราว์เซอร์ไม่รู้ขนาด VRAM จริง จึงเดาจากยุคการ์ด):
 * ไม่มี adapter → 0 | การ์ดมี shader-f16 (ยุคใหม่ VRAM มักพอ) → ครึ่งหนึ่ง |
 * การ์ดเก่า (ไม่มี f16 เช่น Radeon 530 ~2 GB) → หนึ่งในสี่ พอช่วยแต่ไม่ล้น
 * ถ้า offload แล้ว WebGPU ใช้ไม่ได้จริง wllama แค่ log แล้วถอยไป CPU เอง ไม่พัง
 */
export async function resolveGpuOffload(): Promise<number> {
  const stored = getStoredGpuOffload()
  if (stored !== null) return stored
  if (!(await hasWebGpuAdapter())) return 0
  return (await supportsShaderF16())
    ? Math.floor(CPU_MODEL.layerCount / 2)
    : Math.floor(CPU_MODEL.layerCount / 4)
}

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
  const gpuLayers = await resolveGpuOffload()
  // ทางลัดเคสปกติ: โหลดไว้แล้วและค่า offload ไม่เปลี่ยน — ไม่ต้องเข้าคิว
  if (instancePromise && loadedGpuLayers === gpuLayers) return instancePromise

  // สร้าง/สลับ instance ผ่านคิว generation ซึ่งทำหน้าที่เป็น mutex ในตัว:
  // สองสายเรียกพร้อมกันตัวหลังจะเช็คซ้ำแล้วได้ instance เดิม และการปิด instance
  // (ตอนค่า offload เปลี่ยน — n_gpu_layers เป็นพารามิเตอร์ตอนโหลด ต้องโหลดใหม่
  // แต่โมเดลอยู่ใน cache แล้ว ไม่ดาวน์โหลดซ้ำ) จะไม่ตัดขา generation ที่ค้างอยู่
  return enqueue(() => swapCpuEngine(onProgress))
}

async function swapCpuEngine(onProgress?: (progress: number, text: string) => void): Promise<WllamaInstance> {
  const gpuLayers = await resolveGpuOffload()
  if (instancePromise && loadedGpuLayers === gpuLayers) return instancePromise
  await unloadCpuEngine()

  loadedGpuLayers = gpuLayers
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
      // event ความคืบหน้า prefill (return_progress) มาทีละ batch — batch ละ 512
      // ให้ % ขยับถี่พอ (ค่าตั้งต้น 2048 จะได้ event เดียวทั้งพรอมป์)
      n_batch: 512,
      // แบ่งบางเลเยอร์ขึ้น GPU ตามการตั้งค่า/ค่าอัตโนมัติ (ดู resolveGpuOffload) —
      // ห้ามปล่อย undefined เพราะ wllama 3.x จะ offload ทุกเลเยอร์อัตโนมัติ
      // ซึ่งพาไปเจอปัญหา VRAM ล้นแบบเดียวกับ engine.ts บนการ์ดเล็ก
      n_gpu_layers: gpuLayers,
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
  loadedGpuLayers = null
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

// คู่แฝดของ streamLocalReply (engine.ts) — สัญญาเดียวกัน แต่รันบน CPU
export async function streamCpuReply(
  messages: { role: "user" | "assistant"; content: string }[],
  context: AIContext,
  handlers: LocalStreamHandlers,
  opts: { labels: LocalStreamLabels; thinking?: boolean },
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
    // Qwen3 เป็นโมเดล hybrid thinking — เปิด/ปิดโหมดคิดด้วย soft switch /think หรือ /no_think
    // ต่อท้าย system prompt (เป็น token ที่โมเดลถูกเทรนมาให้รู้จัก ไม่ผ่าน template variable)
    // ทำไมไม่ใช้ chat_template_kwargs enable_thinking: wllama ส่ง kwarg ข้ามไป
    // wasm เป็น "อาร์เรย์ของ string" (ดู glue arr_str) ค่า false เลยกลายเป็น "false"
    // ซึ่งใน Jinja ถือเป็น truthy → โหมดคิดไม่ปิดจริง
    const softSwitch = opts.thinking ? "/think" : "/no_think"
    const promptChars = systemPrompt.length + messages.reduce((n, m) => n + m.content.length, 0)
    const prefill = trackPrefillProgress({
      promptChars,
      backend: "cpu",
      onTick: (pct) => handlers.onToolCall?.(`${opts.labels.analyzingPrompt} ${pct}%`),
    })
    try {
      const chunks = await wllama.createChatCompletion({
        messages: [{ role: "system", content: `${systemPrompt}\n\n${softSwitch}` }, ...messages],
        stream: true,
        temperature: 0.6,
        // เปิดโหมดคิดต้องเผื่อ budget ให้ reasoning ไม่กิน max_tokens จนคำตอบขาด
        max_tokens: opts.thinking ? 2048 : 1024,
        // reuse KV cache ของ prefix ที่ตรงกับรอบก่อน (system prompt + ประวัติแชท)
        // ทำงานคู่กับ TTL cache ใน fetchContextPrompt ที่ทำให้ prefix นิ่งพอจะตรงได้จริง
        // → เทิร์นถัดๆ ไป prefill เฉพาะข้อความใหม่ ไม่ใช่ทั้งบทสนทนา
        cache_prompt: true,
        // ขอ event ความคืบหน้า prefill จริง (prompt_progress) จาก llama.cpp —
        // type ของ wllama ยังไม่ประกาศ field นี้ แต่ implementation ส่ง options
        // ทั้งก้อนเป็น JSON เข้า wasm ตรงๆ (ยืนยันแล้วว่า event ทะลุมาถึง chunk)
        ...({ return_progress: true } as object),
      })

      let fullText = ""
      for await (const chunk of chunks) {
        // chunk ความคืบหน้า prefill — จำนวน token ที่ประมวลผลแล้วจริงๆ ไม่ใช่ค่าประมาณ
        const progress = (chunk as { prompt_progress?: import("./shared").PrefillAnchor }).prompt_progress
        if (progress) prefill.anchor(progress)
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

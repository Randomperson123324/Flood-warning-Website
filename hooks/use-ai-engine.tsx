"use client"

// เก็บ preference ว่าผู้ใช้เลือก AI แบบไหน (cloud / on-device) + สถานะโมเดลบนเครื่อง
// ลอกแพทเทิร์นมาจาก use-language.tsx: Context + localStorage + SSR-safe default
// หมายเหตุ: import engine.ts ตรงๆ ได้ ไม่หนัก — ตัว @mlc-ai/web-llm (~5 MB)
// เป็น dynamic import ข้างใน engine.ts อยู่แล้ว จะโหลดก็ต่อเมื่อใช้โหมด local จริง

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  DEFAULT_LOCAL_MODEL_ID,
  F32_FALLBACKS,
  LOCAL_MODELS,
  canonicalModelId,
  getLocalModelInfo,
  variantIds,
  type LocalModelInfo,
} from "@/lib/ai/local/models"
import {
  deleteModel as deleteModelFromCache,
  getEngine,
  hasModelCached,
  isWebGPUAvailable,
  supportsShaderF16,
} from "@/lib/ai/local/engine"
import {
  deleteCpuModel,
  getCpuEngine,
  hasCpuModelCached,
  isCpuMultithreadAvailable,
} from "@/lib/ai/local/cpu-engine"
import { CPU_MODEL } from "@/lib/ai/local/shared"

const ENGINE_KEY = "streeflood:ai-engine"
const MODEL_KEY = "streeflood:ai-local-model"
const BACKEND_KEY = "streeflood:ai-local-backend"

export type AIEngineKind = "cloud" | "local"
/** เส้นทางของโหมด on-device: gpu = WebLLM/WebGPU | cpu = wllama/WebAssembly (ใช้ RAM) */
export type LocalBackend = "gpu" | "cpu"

export interface AIEngineStatus {
  // idle = ยังไม่มีโมเดลในเครื่อง | cached = ดาวน์โหลดไว้แล้วแต่ยังไม่โหลดเข้า GPU
  phase: "idle" | "cached" | "downloading" | "ready" | "error"
  progress?: number
  message?: string
}

interface AIEngineContextValue {
  engine: AIEngineKind
  /** เส้นทางที่ใช้เมื่อ engine = local */
  localBackend: LocalBackend
  localModelId: string
  /** ข้อมูลโมเดลที่เลือกอยู่ ตาม variant ที่จะใช้จริงบนเครื่องนี้ (q4f32 ถ้า GPU ไม่มี shader-f16) */
  localModel: LocalModelInfo
  /** รายชื่อโมเดลให้เลือก แสดง variant ที่เครื่องนี้จะใช้จริง */
  localModels: LocalModelInfo[]
  status: AIEngineStatus
  webgpuSupported: boolean | null
  /** true = หน้านี้ cross-origin isolated → โหมด CPU รัน multi-thread (เร็วกว่า) */
  cpuMultithread: boolean
  setEngine: (next: AIEngineKind) => void
  setLocalBackend: (next: LocalBackend) => void
  /** เปลี่ยนโมเดล (รับ id ของ variant ไหนก็ได้) — ไม่มีผลระหว่างดาวน์โหลด */
  setLocalModel: (id: string) => void
  /** โหลดโมเดลเข้าเครื่อง (ดาวน์โหลดก่อนถ้ายังไม่มี) — เจ้าของ state ความคืบหน้า */
  loadModel: (onProgress?: (pct: number) => void) => Promise<void>
  removeModel: () => Promise<void>
}

const AIEngineContext = createContext<AIEngineContextValue | null>(null)

export function AIEngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngineState] = useState<AIEngineKind>("cloud")
  const [localBackend, setLocalBackendState] = useState<LocalBackend>("gpu")
  // เก็บเป็น id หลัก (รุ่น f16) เสมอ — variant จริงที่ใช้คำนวณจาก f16Ok ด้านล่าง
  const [selectedId, setSelectedId] = useState(DEFAULT_LOCAL_MODEL_ID)
  const [f16Ok, setF16Ok] = useState<boolean | null>(null)
  const [status, setStatus] = useState<AIEngineStatus>({ phase: "idle" })
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null)
  const [cpuMultithread, setCpuMultithread] = useState(false)
  // กัน loadModel ซ้อนกัน (เช่น กดโหลดใน popover พร้อมกับส่งข้อความแรก)
  const loadPromiseRef = useRef<Promise<void> | null>(null)

  // GPU ไม่มี shader-f16 → ชี้ทุกอย่างไปรุ่น q4f32 (getEngine กันซ้ำอีกชั้น แต่ state
  // ต้องตรงเพื่อให้ sizeText/เช็ค cache ชี้รุ่นที่จะโหลดจริง)
  const gpuModelId = f16Ok === false ? (F32_FALLBACKS[selectedId]?.id ?? selectedId) : selectedId
  // โหมด CPU ตรึงโมเดลตัวเดียว (Qwen3 1.7B GGUF) — ใช้ url เป็น id
  const localModelId = localBackend === "cpu" ? CPU_MODEL.url : gpuModelId
  const cpuModelInfo: LocalModelInfo = useMemo(
    () => ({
      id: CPU_MODEL.url,
      label: CPU_MODEL.label,
      sizeText: CPU_MODEL.sizeText,
      vramMB: 0,
      descKey: "modelDescCpu",
    }),
    [],
  )
  const localModel = localBackend === "cpu" ? cpuModelInfo : getLocalModelInfo(gpuModelId)
  const localModels = useMemo(
    () =>
      localBackend === "cpu"
        ? [cpuModelInfo]
        : f16Ok === false
          ? LOCAL_MODELS.map((m) => F32_FALLBACKS[m.id] ?? m)
          : LOCAL_MODELS,
    [localBackend, cpuModelInfo, f16Ok],
  )

  const checkCache = useCallback(async () => {
    try {
      const cached = localBackend === "cpu" ? await hasCpuModelCached() : await hasModelCached(gpuModelId)
      // เช็คสองทาง: id อาจเพิ่งสลับ (backend เปลี่ยน หรือ q4f16→q4f32)
      // ทำให้สถานะ cached ของรุ่นเดิมใช้ไม่ได้แล้ว
      setStatus((prev) => {
        if (prev.phase === "idle" && cached) return { phase: "cached" }
        if (prev.phase === "cached" && !cached) return { phase: "idle" }
        return prev
      })
    } catch {
      // เช็ค cache ไม่ได้ไม่ใช่เรื่องใหญ่ — ปล่อยเป็น idle
    }
  }, [localBackend, gpuModelId])

  useEffect(() => {
    const supported = isWebGPUAvailable()
    setWebgpuSupported(supported)
    setCpuMultithread(isCpuMultithreadAvailable())

    const storedBackend = window.localStorage.getItem(BACKEND_KEY) as LocalBackend | null
    // ไม่มี WebGPU → เส้นทาง CPU เท่านั้นที่ใช้ได้ บังคับไว้เลย
    const backend: LocalBackend = !supported ? "cpu" : storedBackend === "cpu" ? "cpu" : "gpu"
    setLocalBackendState(backend)

    // โหมด local ใช้ได้เสมอแล้ว เพราะเส้นทาง CPU ไม่ต้องพึ่ง GPU
    if (window.localStorage.getItem(ENGINE_KEY) === "local") setEngineState("local")

    const storedModel = window.localStorage.getItem(MODEL_KEY)
    if (storedModel) {
      const canonical = canonicalModelId(storedModel)
      if (LOCAL_MODELS.some((m) => m.id === canonical)) setSelectedId(canonical)
    }
    if (supported) void supportsShaderF16().then(setF16Ok)
  }, [])

  // GPU ที่ไม่มี shader-f16 = การ์ดรุ่นเก่า (เช่น Radeon 530) ซึ่งมักมี VRAM ~2 GB
  // แต่รุ่น q4f32 ที่จำเป็นต้องใช้แทนกลับกิน VRAM มากกว่าเดิม (4.3 GB) → โหลดไม่ขึ้น
  // และ WebGPU จะพ่นข้อความมั่วออกมาเงียบๆ แทนที่จะ error → ตั้งต้นเป็น CPU ปลอดภัยกว่า
  // (ผู้ใช้ที่เคยเลือกเองไว้แล้ว ให้เคารพค่าที่เลือก)
  useEffect(() => {
    if (f16Ok !== false) return
    if (window.localStorage.getItem(BACKEND_KEY)) return
    setLocalBackendState("cpu")
  }, [f16Ok])

  useEffect(() => {
    if (engine === "local") void checkCache()
  }, [engine, checkCache])

  const setEngine = useCallback((next: AIEngineKind) => {
    setEngineState(next)
    window.localStorage.setItem(ENGINE_KEY, next)
  }, [])

  const setLocalBackend = useCallback((next: LocalBackend) => {
    // ระหว่างดาวน์โหลด/โหลดโมเดลห้ามสลับ — progress ที่โชว์อยู่จะชี้ผิดเส้นทาง
    if (loadPromiseRef.current) return
    if (next === "gpu" && !isWebGPUAvailable()) return
    setLocalBackendState(next)
    window.localStorage.setItem(BACKEND_KEY, next)
    // เอนจินคนละตัว คนละโมเดล — สถานะเดิมใช้ต่อไม่ได้ (checkCache จะอัปเดตให้เอง)
    setStatus({ phase: "idle" })
  }, [])

  const setLocalModel = useCallback((id: string) => {
    // ระหว่างดาวน์โหลด/โหลดเข้า GPU ห้ามสลับ — progress ที่โชว์อยู่จะชี้ผิดโมเดล
    if (loadPromiseRef.current) return
    const canonical = canonicalModelId(id)
    if (!LOCAL_MODELS.some((m) => m.id === canonical)) return
    setSelectedId(canonical)
    window.localStorage.setItem(MODEL_KEY, canonical)
    // เคลียร์สถานะของโมเดลเดิม — checkCache (effect ด้านบน) จะอัปเดตเป็น cached ให้เอง
    setStatus({ phase: "idle" })
  }, [])

  const loadModel = useCallback(
    (onProgress?: (pct: number) => void) => {
      if (loadPromiseRef.current) return loadPromiseRef.current

      const run = (async () => {
        setStatus((prev) => (prev.phase === "ready" ? prev : { phase: "downloading", progress: 0 }))
        const onLoadProgress = (progress: number) => {
          const pct = Math.round(progress * 100)
          setStatus({ phase: "downloading", progress: pct })
          onProgress?.(pct)
        }
        try {
          if (localBackend === "cpu") {
            await getCpuEngine(onLoadProgress)
          } else {
            await getEngine(gpuModelId, onLoadProgress)
          }
          setStatus({ phase: "ready" })
        } catch (err) {
          setStatus({ phase: "error", message: err instanceof Error ? err.message : String(err) })
          throw err
        } finally {
          loadPromiseRef.current = null
        }
      })()
      loadPromiseRef.current = run
      return run
    },
    [localBackend, gpuModelId],
  )

  const removeModel = useCallback(async () => {
    if (localBackend === "cpu") {
      await deleteCpuModel()
    } else {
      // ลบทุก variant (f16/f32) — เครื่องที่สลับรุ่น fallback อาจมีไฟล์รุ่นเดิมค้างอยู่
      for (const id of variantIds(gpuModelId)) {
        await deleteModelFromCache(id)
      }
    }
    setStatus({ phase: "idle" })
  }, [localBackend, gpuModelId])

  const value = useMemo<AIEngineContextValue>(
    () => ({
      engine,
      localBackend,
      localModelId,
      localModel,
      localModels,
      status,
      webgpuSupported,
      cpuMultithread,
      setEngine,
      setLocalBackend,
      setLocalModel,
      loadModel,
      removeModel,
    }),
    [
      engine,
      localBackend,
      localModelId,
      localModel,
      localModels,
      status,
      webgpuSupported,
      cpuMultithread,
      setEngine,
      setLocalBackend,
      setLocalModel,
      loadModel,
      removeModel,
    ],
  )

  return <AIEngineContext.Provider value={value}>{children}</AIEngineContext.Provider>
}

export function useAIEngine(): AIEngineContextValue {
  const ctx = useContext(AIEngineContext)
  if (!ctx) throw new Error("useAIEngine must be used within AIEngineProvider")
  return ctx
}

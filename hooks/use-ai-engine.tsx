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

const ENGINE_KEY = "streeflood:ai-engine"
const MODEL_KEY = "streeflood:ai-local-model"

export type AIEngineKind = "cloud" | "local"

export interface AIEngineStatus {
  // idle = ยังไม่มีโมเดลในเครื่อง | cached = ดาวน์โหลดไว้แล้วแต่ยังไม่โหลดเข้า GPU
  phase: "idle" | "cached" | "downloading" | "ready" | "error"
  progress?: number
  message?: string
}

interface AIEngineContextValue {
  engine: AIEngineKind
  localModelId: string
  /** ข้อมูลโมเดลที่เลือกอยู่ ตาม variant ที่จะใช้จริงบนเครื่องนี้ (q4f32 ถ้า GPU ไม่มี shader-f16) */
  localModel: LocalModelInfo
  /** รายชื่อโมเดลให้เลือก แสดง variant ที่เครื่องนี้จะใช้จริง */
  localModels: LocalModelInfo[]
  status: AIEngineStatus
  webgpuSupported: boolean | null
  setEngine: (next: AIEngineKind) => void
  /** เปลี่ยนโมเดล (รับ id ของ variant ไหนก็ได้) — ไม่มีผลระหว่างดาวน์โหลด */
  setLocalModel: (id: string) => void
  /** โหลดโมเดลเข้า GPU (ดาวน์โหลดก่อนถ้ายังไม่มีในเครื่อง) — เจ้าของ state ความคืบหน้า */
  loadModel: (onProgress?: (pct: number) => void) => Promise<void>
  removeModel: () => Promise<void>
}

const AIEngineContext = createContext<AIEngineContextValue | null>(null)

export function AIEngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngineState] = useState<AIEngineKind>("cloud")
  // เก็บเป็น id หลัก (รุ่น f16) เสมอ — variant จริงที่ใช้คำนวณจาก f16Ok ด้านล่าง
  const [selectedId, setSelectedId] = useState(DEFAULT_LOCAL_MODEL_ID)
  const [f16Ok, setF16Ok] = useState<boolean | null>(null)
  const [status, setStatus] = useState<AIEngineStatus>({ phase: "idle" })
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null)
  // กัน loadModel ซ้อนกัน (เช่น กดโหลดใน popover พร้อมกับส่งข้อความแรก)
  const loadPromiseRef = useRef<Promise<void> | null>(null)

  // GPU ไม่มี shader-f16 → ชี้ทุกอย่างไปรุ่น q4f32 (getEngine กันซ้ำอีกชั้น แต่ state
  // ต้องตรงเพื่อให้ sizeText/เช็ค cache ชี้รุ่นที่จะโหลดจริง)
  const localModelId = f16Ok === false ? (F32_FALLBACKS[selectedId]?.id ?? selectedId) : selectedId
  const localModel = getLocalModelInfo(localModelId)
  const localModels = useMemo(
    () => (f16Ok === false ? LOCAL_MODELS.map((m) => F32_FALLBACKS[m.id] ?? m) : LOCAL_MODELS),
    [f16Ok],
  )

  const checkCache = useCallback(async () => {
    try {
      const cached = await hasModelCached(localModelId)
      // เช็คสองทาง: id อาจเพิ่งสลับเป็นรุ่น q4f32 (GPU ไม่มี shader-f16)
      // ทำให้สถานะ cached ของรุ่นเดิมใช้ไม่ได้แล้ว
      setStatus((prev) => {
        if (prev.phase === "idle" && cached) return { phase: "cached" }
        if (prev.phase === "cached" && !cached) return { phase: "idle" }
        return prev
      })
    } catch {
      // เช็ค cache ไม่ได้ไม่ใช่เรื่องใหญ่ — ปล่อยเป็น idle
    }
  }, [localModelId])

  useEffect(() => {
    const supported = isWebGPUAvailable()
    setWebgpuSupported(supported)
    const stored = window.localStorage.getItem(ENGINE_KEY) as AIEngineKind | null
    // เคยเลือก local ไว้แต่เบราว์เซอร์ตอนนี้ไม่มี WebGPU (เปลี่ยนเครื่อง/เบราว์เซอร์)
    // → ถอยกลับ cloud เงียบๆ ให้ใช้งานต่อได้
    if (stored === "local" && supported) setEngineState("local")
    const storedModel = window.localStorage.getItem(MODEL_KEY)
    if (storedModel) {
      const canonical = canonicalModelId(storedModel)
      if (LOCAL_MODELS.some((m) => m.id === canonical)) setSelectedId(canonical)
    }
    if (supported) void supportsShaderF16().then(setF16Ok)
  }, [])

  useEffect(() => {
    if (engine === "local") void checkCache()
  }, [engine, checkCache])

  const setEngine = useCallback((next: AIEngineKind) => {
    if (next === "local" && !isWebGPUAvailable()) return
    setEngineState(next)
    window.localStorage.setItem(ENGINE_KEY, next)
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
        try {
          await getEngine(localModelId, (progress) => {
            const pct = Math.round(progress * 100)
            setStatus({ phase: "downloading", progress: pct })
            onProgress?.(pct)
          })
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
    [localModelId],
  )

  const removeModel = useCallback(async () => {
    // ลบทุก variant (f16/f32) — เครื่องที่สลับรุ่น fallback อาจมีไฟล์รุ่นเดิมค้างอยู่
    for (const id of variantIds(localModelId)) {
      await deleteModelFromCache(id)
    }
    setStatus({ phase: "idle" })
  }, [localModelId])

  const value = useMemo<AIEngineContextValue>(
    () => ({
      engine,
      localModelId,
      localModel,
      localModels,
      status,
      webgpuSupported,
      setEngine,
      setLocalModel,
      loadModel,
      removeModel,
    }),
    [
      engine,
      localModelId,
      localModel,
      localModels,
      status,
      webgpuSupported,
      setEngine,
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

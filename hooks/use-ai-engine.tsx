"use client"

// เก็บ preference ว่าผู้ใช้เลือก AI แบบไหน (cloud / on-device) + สถานะโมเดลบนเครื่อง
// ลอกแพทเทิร์นมาจาก use-language.tsx: Context + localStorage + SSR-safe default
// หมายเหตุ: import engine.ts ตรงๆ ได้ ไม่หนัก — ตัว @mlc-ai/web-llm (~5 MB)
// เป็น dynamic import ข้างใน engine.ts อยู่แล้ว จะโหลดก็ต่อเมื่อใช้โหมด local จริง

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { DEFAULT_LOCAL_MODEL_ID, LOCAL_MODELS } from "@/lib/ai/local/models"
import {
  deleteModel as deleteModelFromCache,
  getEngine,
  hasModelCached,
  isWebGPUAvailable,
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
  status: AIEngineStatus
  webgpuSupported: boolean | null
  setEngine: (next: AIEngineKind) => void
  /** โหลดโมเดลเข้า GPU (ดาวน์โหลดก่อนถ้ายังไม่มีในเครื่อง) — เจ้าของ state ความคืบหน้า */
  loadModel: (onProgress?: (pct: number) => void) => Promise<void>
  removeModel: () => Promise<void>
}

const AIEngineContext = createContext<AIEngineContextValue | null>(null)

export function AIEngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngineState] = useState<AIEngineKind>("cloud")
  const [localModelId] = useState(DEFAULT_LOCAL_MODEL_ID)
  const [status, setStatus] = useState<AIEngineStatus>({ phase: "idle" })
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null)
  // กัน loadModel ซ้อนกัน (เช่น กดโหลดใน popover พร้อมกับส่งข้อความแรก)
  const loadPromiseRef = useRef<Promise<void> | null>(null)

  const checkCache = useCallback(async () => {
    try {
      const cached = await hasModelCached(localModelId)
      setStatus((prev) => (prev.phase === "idle" && cached ? { phase: "cached" } : prev))
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
    if (stored === "local" && supported) {
      setEngineState("local")
      void checkCache()
    }
  }, [checkCache])

  const setEngine = useCallback(
    (next: AIEngineKind) => {
      if (next === "local" && !isWebGPUAvailable()) return
      setEngineState(next)
      window.localStorage.setItem(ENGINE_KEY, next)
      window.localStorage.setItem(MODEL_KEY, localModelId)
      if (next === "local") void checkCache()
    },
    [localModelId, checkCache],
  )

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
    await deleteModelFromCache(localModelId)
    setStatus({ phase: "idle" })
  }, [localModelId])

  const value = useMemo<AIEngineContextValue>(
    () => ({ engine, localModelId, status, webgpuSupported, setEngine, loadModel, removeModel }),
    [engine, localModelId, status, webgpuSupported, setEngine, loadModel, removeModel],
  )

  return <AIEngineContext.Provider value={value}>{children}</AIEngineContext.Provider>
}

export function useAIEngine(): AIEngineContextValue {
  const ctx = useContext(AIEngineContext)
  if (!ctx) throw new Error("useAIEngine must be used within AIEngineProvider")
  return ctx
}

export { LOCAL_MODELS }

"use client"

// popover เลือก engine ของผู้ช่วย AI (Cloud / บนเครื่อง) — ใช้ร่วมกันทั้ง
// แผง AI ลอย (assistant-panel) และช่องแชทชุมชนตอนพิมพ์ /AI (chat-panel)

import { useEffect, useRef, useState } from "react"
import {
  Brain,
  Check,
  ChevronDown,
  Cloud,
  Cpu,
  LoaderCircle,
  MemoryStick,
  Settings2,
  SlidersHorizontal,
  TriangleAlert,
  Trash2,
  Zap,
} from "lucide-react"
import { useAIEngine } from "@/hooks/use-ai-engine"
import { useLanguage } from "@/hooks/use-language"
import { getStorageEstimate, hasWebGpuAdapter } from "@/lib/ai/local/engine"
import { resolveGpuOffload, setStoredGpuOffload } from "@/lib/ai/local/cpu-engine"
import { CPU_MODEL, getPrefillCalibration, type PrefillCalibration } from "@/lib/ai/local/shared"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`
  return `${Math.round(bytes / 1_000)} KB`
}

export function EngineSettings({ direction = "down" }: { direction?: "down" | "up" }) {
  const { t } = useLanguage()
  const {
    engine,
    localBackend,
    localModel,
    localModels,
    status,
    webgpuSupported,
    cpuMultithread,
    thinking,
    setEngine,
    setLocalBackend,
    setThinking,
    setLocalModel,
    loadModel,
    removeModel,
  } = useAIEngine()
  const [open, setOpen] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [prefillCal, setPrefillCal] = useState<PrefillCalibration | null>(null)
  // GPU offload ของโหมด CPU: null = ยัง resolve ไม่เสร็จ | เลขคือเลเยอร์ที่ใช้จริง
  const [gpuOffload, setGpuOffload] = useState<number | null>(null)
  const [gpuAdapterOk, setGpuAdapterOk] = useState<boolean | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const model = localModel

  // จำนวนเธรดที่ wllama จะใช้จริงเมื่อ multi-thread ได้ (ค่าตั้งต้นของ wllama = ครึ่งหนึ่ง
  // ของ hardwareConcurrency) — โชว์ในตัวเลือกขั้นสูงให้เห็นว่าโหมด CPU ได้กี่เธรด
  const cpuThreads = Math.max(1, Math.floor((typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 1 : 1) / 2))

  useEffect(() => {
    if (!open) return
    setPrefillCal(getPrefillCalibration(localBackend))
    void hasWebGpuAdapter().then(setGpuAdapterOk)
    void resolveGpuOffload().then(setGpuOffload)
  }, [open, localBackend])

  useEffect(() => {
    if (!open) return
    setDeleteArmed(false)
    void getStorageEstimate().then(setStorage)
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const hasModelOnDisk = status.phase === "cached" || status.phase === "ready"

  async function handleDelete() {
    if (!deleteArmed) {
      setDeleteArmed(true)
      return
    }
    setDeleteArmed(false)
    await removeModel()
    void getStorageEstimate().then(setStorage)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("ai", "engineSettings")}
        aria-label={t("ai", "engineSettings")}
        className={cn("text-ink-soft transition-colors hover:text-accent", open && "text-accent")}
      >
        {engine === "local" ? <Cpu className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
      </button>

      {open && (
        // เปลือกนอกถือ glass/เบลอ/มุมโค้ง ส่วน div ด้านในเป็นตัวเลื่อน — แยกกันเพื่อไม่ให้
        // overflow-y-auto ไปทับ overflow-hidden ของ .glass-panel-strong (ที่ใช้ตัดมุมโค้ง
        // และเส้นไฮไลต์ ::before ด้านบน)
        //
        // max-h จำเป็น: popover นี้อยู่ใน assistant-panel ที่เป็น overflow-hidden และสูงคงที่
        // (clamp 28rem) — ถ้าเนื้อหายาวเกินจะโดนตัดหาย กดปุ่มลบ/ดูพื้นที่ใช้งานไม่ได้
        <div
          className={cn(
            "glass-panel-strong absolute right-0 z-50 w-72 text-left shadow-lg backdrop-blur-2xl",
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2",
          )}
        >
          <div className="max-h-[19rem] space-y-3 overflow-y-auto overscroll-contain p-3">
            <p className="text-xs font-medium text-ink-soft">{t("ai", "engineSettings")}</p>

            {/* ตัวเลือก engine */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setEngine("cloud")}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                  engine === "cloud" ? "border-accent/60 bg-accent/10" : "border-border/10 hover:border-border/30",
                )}
              >
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t("ai", "engineCloud")}</span>
                  <span className="block text-xs text-ink-soft">{t("ai", "engineCloudDesc")}</span>
                </span>
                {engine === "cloud" && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
              </button>

              <button
                type="button"
                onClick={() => setEngine("local")}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                  engine === "local" ? "border-accent/60 bg-accent/10" : "border-border/10 hover:border-border/30",
                )}
              >
                <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t("ai", "engineLocal")}</span>
                  <span className="block text-xs text-ink-soft">{t("ai", "engineLocalDesc")}</span>
                </span>
                {engine === "local" && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
              </button>
            </div>

            {/* เลือกเส้นทางของโหมดบนเครื่อง: GPU (เร็ว ต้องมี VRAM) หรือ CPU (ช้า แต่ใช้ RAM ทำงานได้ทุกเครื่อง) */}
            {engine === "local" && (
              <div className="space-y-1.5">
                {(
                  [
                    { key: "gpu", icon: Zap, label: "backendGpu", desc: "backendGpuDesc" },
                    { key: "cpu", icon: MemoryStick, label: "backendCpu", desc: "backendCpuDesc" },
                  ] as const
                ).map(({ key, icon: Icon, label, desc }) => {
                  const unavailable = key === "gpu" && webgpuSupported === false
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setLocalBackend(key)
                        setDeleteArmed(false)
                      }}
                      disabled={unavailable || status.phase === "downloading"}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg border p-2 text-left transition-colors",
                        localBackend === key
                          ? "border-accent/60 bg-accent/10"
                          : "border-border/10 hover:border-border/30",
                        (unavailable || status.phase === "downloading") && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{t("ai", label)}</span>
                        <span className="block text-xs text-ink-soft">
                          {unavailable ? t("ai", "webgpuUnsupported") : t("ai", desc)}
                        </span>
                      </span>
                      {localBackend === key && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
                    </button>
                  )
                })}
                {localBackend === "cpu" && !cpuMultithread && (
                  <p className="flex items-start gap-1.5 px-1 text-[11px] text-status-warning">
                    <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                    {t("ai", "backendCpuSlow")}
                  </p>
                )}
              </div>
            )}

            {/* โหมดคิดของ Qwen3 (thinking) — แถวเดียวกดสลับเปิด/ปิด มีผลรอบถามถัดไปทันที */}
            {engine === "local" && (
              <button
                type="button"
                onClick={() => setThinking(!thinking)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border p-2 text-left transition-colors",
                  thinking ? "border-accent/60 bg-accent/10" : "border-border/10 hover:border-border/30",
                )}
              >
                <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t("ai", "thinkingToggle")}</span>
                  <span className="block text-xs text-ink-soft">{t("ai", "thinkingToggleDesc")}</span>
                </span>
                {thinking && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
              </button>
            )}

            {/* ตัวเลือกขั้นสูง — สถานะเชิงเทคนิคของโหมดบนเครื่อง (มัลติเธรด, ความเร็วที่วัดได้) */}
            {engine === "local" && (
              <div className="rounded-lg border border-border/10">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-ink-soft transition-colors hover:text-accent"
                >
                  <SlidersHorizontal className="h-3 w-3 shrink-0 text-accent" />
                  {t("ai", "advancedOptions")}
                  <ChevronDown className={cn("ml-auto h-3 w-3 shrink-0 transition-transform", advancedOpen && "rotate-180")} />
                </button>
                {advancedOpen && (
                  <div className="space-y-1.5 border-t border-border/10 px-2.5 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink-soft">{t("ai", "multithreadLabel")}</span>
                      <span className={cpuMultithread ? "text-status-normal" : "text-status-warning"}>
                        {cpuMultithread
                          ? `${t("ai", "multithreadOn")} · ${cpuThreads} ${t("ai", "threadsUnit")}`
                          : t("ai", "multithreadOff")}
                      </span>
                    </div>
                    {!cpuMultithread && (
                      <p className="text-[11px] leading-relaxed text-ink-soft">{t("ai", "multithreadOffHint")}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink-soft">{t("ai", "measuredPrefillRate")}</span>
                      <span>{prefillCal ? `${prefillCal.rate.toFixed(1)} token/s` : "—"}</span>
                    </div>

                    {/* GPU offload (เฉพาะโหมด CPU) — แบ่งเลเยอร์ไปรันบนการ์ดจอแบบ LM Studio */}
                    {localBackend === "cpu" && (
                      <div className="space-y-1 border-t border-border/10 pt-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-ink-soft">{t("ai", "gpuOffload")}</span>
                          <span className={gpuAdapterOk === false ? "text-ink-soft" : undefined}>
                            {gpuAdapterOk === false
                              ? t("ai", "gpuOffloadUnavailable")
                              : gpuOffload === null
                                ? "…"
                                : `${gpuOffload} / ${CPU_MODEL.layerCount} ${t("ai", "layersUnit")}`}
                          </span>
                        </div>
                        {gpuAdapterOk !== false && (
                          <>
                            <input
                              type="range"
                              min={0}
                              max={CPU_MODEL.layerCount}
                              step={1}
                              value={gpuOffload ?? 0}
                              disabled={gpuOffload === null || status.phase === "downloading"}
                              onChange={(e) => {
                                const n = Number(e.target.value)
                                setGpuOffload(n)
                                setStoredGpuOffload(n)
                              }}
                              className="h-1 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
                              aria-label={t("ai", "gpuOffload")}
                            />
                            <p className="text-[11px] leading-relaxed text-ink-soft">{t("ai", "gpuOffloadDesc")}</p>
                            <p className="text-[11px] leading-relaxed text-ink-soft">{t("ai", "gpuOffloadNote")}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* เลือกโมเดล — โชว์ variant ที่เครื่องนี้จะใช้จริง (f16/f32)
                โหมด CPU มีโมเดลตัวเดียว ไม่ต้องโชว์ตัวเลือก (กล่องสถานะด้านล่างบอกชื่ออยู่แล้ว) */}
            {engine === "local" && localModels.length > 1 && (
              <div className="space-y-1.5">
                {localModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setLocalModel(m.id)
                      setDeleteArmed(false)
                    }}
                    disabled={status.phase === "downloading"}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                      m.id === model.id ? "border-accent/60 bg-accent/10" : "border-border/10 hover:border-border/30",
                      status.phase === "downloading" && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {m.label} <span className="text-xs font-normal text-ink-soft">{m.sizeText}</span>
                      </span>
                      <span className="block text-xs text-ink-soft">{t("ai", m.descKey)}</span>
                    </span>
                    {m.id === model.id && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
                  </button>
                ))}
              </div>
            )}

            {/* สถานะโมเดลบนเครื่อง — โชว์เมื่อเลือกโหมด local */}
            {engine === "local" && (
              <div className="space-y-2 rounded-lg border border-border/10 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{model.label}</p>
                    <p className="text-xs text-ink-soft">{model.sizeText}</p>
                  </div>
                  {status.phase === "ready" && (
                    <span className="flex items-center gap-1 text-xs text-status-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-status-normal" />
                      {t("ai", "modelReady")}
                    </span>
                  )}
                  {status.phase === "cached" && (
                    <span className="flex items-center gap-1 text-xs text-ink-soft">
                      <Check className="h-3.5 w-3.5" />
                      {t("ai", "modelCached")}
                    </span>
                  )}
                </div>

                {status.phase === "downloading" ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                      {t("ai", "downloading")} {status.progress ?? 0}%
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/20">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${status.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                ) : status.phase !== "ready" ? (
                  <button
                    type="button"
                    onClick={() => void loadModel().catch(() => {})}
                    className="glass-panel w-full px-3 py-1.5 text-center text-sm text-accent transition-colors hover:bg-accent/10"
                  >
                    {status.phase === "cached" ? t("ai", "loadModel") : t("ai", "downloadModel")}
                  </button>
                ) : null}

                {status.phase === "error" && (
                  <p className="text-xs text-status-danger">{t("ai", "localLoadError")}</p>
                )}

                {(hasModelOnDisk || status.phase === "error") && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 px-3 py-1 text-xs transition-colors",
                      deleteArmed ? "text-status-danger" : "text-ink-soft hover:text-status-danger",
                    )}
                  >
                    <Trash2 className="h-3 w-3" />
                    {deleteArmed ? t("ai", "deleteConfirm") : t("ai", "deleteModel")}
                  </button>
                )}

                {storage && storage.usage > 0 && (
                  <p className="text-center text-[11px] text-ink-soft">
                    {t("ai", "storageUsed")}: {formatBytes(storage.usage)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

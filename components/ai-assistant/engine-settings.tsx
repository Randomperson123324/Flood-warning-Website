"use client"

// popover เลือก engine ของผู้ช่วย AI (Cloud / บนเครื่อง) — ใช้ร่วมกันทั้ง
// แผง AI ลอย (assistant-panel) และช่องแชทชุมชนตอนพิมพ์ /AI (chat-panel)

import { useEffect, useRef, useState } from "react"
import { Check, Cloud, Cpu, LoaderCircle, Settings2, Trash2 } from "lucide-react"
import { useAIEngine } from "@/hooks/use-ai-engine"
import { useLanguage } from "@/hooks/use-language"
import { getStorageEstimate } from "@/lib/ai/local/engine"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`
  return `${Math.round(bytes / 1_000)} KB`
}

export function EngineSettings({ direction = "down" }: { direction?: "down" | "up" }) {
  const { t } = useLanguage()
  const { engine, localModel, status, webgpuSupported, setEngine, loadModel, removeModel } = useAIEngine()
  const [open, setOpen] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const model = localModel

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
        <div
          className={cn(
            "glass-panel-strong absolute right-0 z-50 w-72 space-y-3 p-3 text-left shadow-lg",
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2",
          )}
        >
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
              disabled={webgpuSupported === false}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                engine === "local" ? "border-accent/60 bg-accent/10" : "border-border/10 hover:border-border/30",
                webgpuSupported === false && "cursor-not-allowed opacity-50",
              )}
            >
              <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t("ai", "engineLocal")}</span>
                <span className="block text-xs text-ink-soft">
                  {webgpuSupported === false ? t("ai", "webgpuUnsupported") : t("ai", "engineLocalDesc")}
                </span>
              </span>
              {engine === "local" && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
            </button>
          </div>

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
      )}
    </div>
  )
}

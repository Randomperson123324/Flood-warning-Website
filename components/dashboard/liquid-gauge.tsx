"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { WarningSeverity } from "@/types"

interface LiquidGaugeProps {
  levelCm: number
  warningCm: number
  dangerCm: number
  /** Physical scale of the tube — defaults to a sensible multiple of dangerCm. */
  maxScaleCm?: number
  severity: WarningSeverity
  className?: string
}

const SEVERITY_FILL: Record<WarningSeverity, string> = {
  normal: "rgb(var(--status-normal-rgb) / 0.55)",
  warning: "rgb(var(--status-warning-rgb) / 0.55)",
  danger: "rgb(var(--status-danger-rgb) / 0.6)",
}

export function LiquidGauge({ levelCm, warningCm, dangerCm, maxScaleCm, severity, className }: LiquidGaugeProps) {
  const maxScale = maxScaleCm ?? Math.max(dangerCm * 1.35, warningCm * 1.6, levelCm * 1.15, 10)

  const fillPct = clampPercent((levelCm / maxScale) * 100)
  const warningPct = clampPercent((warningCm / maxScale) * 100)
  const dangerPct = clampPercent((dangerCm / maxScale) * 100)

  const fillColor = SEVERITY_FILL[severity]

  const wobbleDuration = useMemo(() => 4 + Math.random() * 1.5, [])

  return (
    <div
      className={cn(
        "glass-panel-strong relative h-56 w-28 shrink-0 overflow-hidden sm:h-64 sm:w-32",
        className,
      )}
      role="img"
      aria-label={`${levelCm.toFixed(1)} cm`}
    >
      {/* Threshold guide lines */}
      <GuideLine bottomPct={warningPct} colorClass="bg-status-warning/70" />
      <GuideLine bottomPct={dangerPct} colorClass="bg-status-danger/70" />

      {/* Liquid fill */}
      <div
        className="liquid-fill absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-glass"
        style={{ height: `${fillPct}%`, background: fillColor }}
      >
        <div className="liquid-wave-a absolute -top-3 left-0 h-6 w-[200%]" />
        <div className="liquid-wave-b absolute -top-2 left-0 h-6 w-[200%]" />
      </div>

      {/* Glass reflection streak */}
      <div className="pointer-events-none absolute inset-y-3 left-2 w-2 rounded-full bg-white/25 blur-[2px]" />

      <style jsx>{`
        .liquid-fill {
          border-top-left-radius: 45% 12px;
          border-top-right-radius: 45% 12px;
        }
        .liquid-wave-a,
        .liquid-wave-b {
          background: radial-gradient(ellipse at center, rgb(255 255 255 / 0.35) 0%, transparent 70%);
          border-radius: 45%;
          animation: wave-scroll ${wobbleDuration}s linear infinite;
        }
        .liquid-wave-b {
          animation-direction: reverse;
          opacity: 0.6;
          animation-duration: ${wobbleDuration * 1.4}s;
        }
        @keyframes wave-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-wave-a,
          .liquid-wave-b {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

function GuideLine({ bottomPct, colorClass }: { bottomPct: number; colorClass: string }) {
  return (
    <div
      className={cn("absolute inset-x-2 z-10 h-[2px] rounded-full opacity-80", colorClass)}
      style={{ bottom: `${bottomPct}%` }}
    />
  )
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

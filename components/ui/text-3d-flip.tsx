"use client"

import { cn } from "@/lib/utils"
import { ElementType, ReactNode } from "react"

interface Text3DFlipProps {
  children: string
  as?: ElementType
  className?: string
  textClassName?: string
  flipTextClassName?: string
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center" | "random"
  rotateDirection?: "top" | "bottom"
}

export default function Text3DFlip({
  children,
  as: Component = "p",
  className,
  textClassName,
  flipTextClassName,
  staggerDuration = 0.05,
  staggerFrom = "first",
  rotateDirection = "top",
}: Text3DFlipProps) {
  const chars = children.split("")
  const total = chars.length

  function getDelay(i: number): number {
    if (staggerFrom === "first")  return i * staggerDuration
    if (staggerFrom === "last")   return (total - 1 - i) * staggerDuration
    if (staggerFrom === "center") return Math.abs(i - Math.floor(total / 2)) * staggerDuration
    if (staggerFrom === "random") return Math.random() * total * staggerDuration
    return i * staggerDuration
  }

  // front face starts visible, back face starts rotated away
  const frontStart  = "rotateX(0deg)"
  const frontEnd    = rotateDirection === "top" ? "rotateX(90deg)" : "rotateX(-90deg)"
  const backStart   = rotateDirection === "top" ? "rotateX(-90deg)" : "rotateX(90deg)"
  const backEnd     = "rotateX(0deg)"

  return (
    <>
      <style>{`
        .t3d-char { position: relative; display: inline-block; }
        .t3d-char .t3d-front,
        .t3d-char .t3d-back {
          display: inline-block;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .t3d-char .t3d-back {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
      <Component
        className={cn("inline-flex flex-wrap", className)}
        style={{ perspective: "600px" }}
      >
        {chars.map((char, i) => {
          const delay = getDelay(i)
          return (
            <span
              key={i}
              className="t3d-char"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front face — visible at rest, flips away */}
              <span
                className={cn("t3d-front", textClassName)}
                style={{
                  display: "inline-block",
                  animation: `t3dFront_${rotateDirection} 0.4s ease forwards`,
                  animationDelay: `${delay}s`,
                  transform: frontStart,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
              {/* Back face — starts rotated away, flips in */}
              <span
                className={cn("t3d-back", flipTextClassName)}
                style={{
                  animation: `t3dBack_${rotateDirection} 0.4s ease forwards`,
                  animationDelay: `${delay}s`,
                  transform: backStart,
                }}
                aria-hidden
              >
                {char === " " ? "\u00A0" : char}
              </span>
            </span>
          )
        })}
      </Component>
      <style>{`
        @keyframes t3dFront_top {
          0%   { transform: rotateX(0deg); }
          100% { transform: rotateX(90deg); }
        }
        @keyframes t3dBack_top {
          0%   { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes t3dFront_bottom {
          0%   { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }
        @keyframes t3dBack_bottom {
          0%   { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
      `}</style>
    </>
  )
}
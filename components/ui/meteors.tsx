"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface MeteorsProps {
  number?: number
  angle?: number
  className?: string
}

export function Meteors({ number = 20, angle = 215, className }: MeteorsProps) {
  const [styles, setStyles] = useState<
    { top: string; left: string; delay: string; duration: string }[]
  >([])

  useEffect(() => {
    setStyles(
      Array.from({ length: number }, () => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${(Math.random() * 3).toFixed(2)}s`,
        duration: `${(2 + Math.random() * 6).toFixed(2)}s`,
      }))
    )
  }, [number])

  // Don't render until client has set real random positions
  if (styles.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes meteorFall-${angle} {
          0%   { transform: rotate(${angle}deg) translateX(0);      opacity: 1; }
          70%  {                                                      opacity: 1; }
          100% { transform: rotate(${angle}deg) translateX(-600px); opacity: 0; }
        }
      `}</style>

      {styles.map((s, i) => (
        <span
          key={i}
          className={cn("pointer-events-none absolute", className)}
          style={{ top: s.top, left: s.left }}
        >
          {/* The meteor streak — starts with zero width, grows via keyframe */}
          <span
            style={{
              display: "block",
              width: "100px",
              height: "1px",
              background: "linear-gradient(90deg, #ef4444, transparent)",
              boxShadow: "0 0 6px 1px rgba(239,68,68,0.4)",
              borderRadius: "9999px",
              animationName: `meteorFall-${angle}`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDelay: s.delay,
              animationDuration: s.duration,
              // Start off-screen by pushing it to the transform start
              opacity: 0,
            }}
          />
        </span>
      ))}
    </>
  )
}
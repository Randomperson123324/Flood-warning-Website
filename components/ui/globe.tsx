"use client"

import { useEffect, useRef } from "react"
import createGlobe from "cobe"
import { cn } from "@/lib/utils"

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let phi = 0
    let width = 0

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth
      }
    }
    
    window.addEventListener("resize", onResize)
    onResize()

    if (!canvasRef.current) return

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      // The `|| 1000` strictly prevents the map from scaling to 0x0 and vanishing
      width: width * 2 || 1000, 
      height: width * 2 || 1000,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1], // Pure white landmass dots
      markerColor: [251 / 255, 100 / 255, 21 / 255],
      glowColor: [1, 1, 1],
      markers: [
        { location: [14.5995, 120.9842], size: 0.03 },
        { location: [19.076, 72.8777], size: 0.1 },
        { location: [23.8103, 90.4125], size: 0.05 },
        { location: [30.0444, 31.2357], size: 0.07 },
        { location: [39.9042, 116.4074], size: 0.08 },
        { location: [-23.5505, -46.6333], size: 0.1 },
        { location: [19.4326, -99.1332], size: 0.1 },
        { location: [40.7128, -74.006], size: 0.1 },
        { location: [34.6937, 135.5022], size: 0.05 },
        { location: [41.0082, 28.9784], size: 0.06 },
      ],
      onRender: (state) => {
        state.phi = phi
        phi += 0.005
        state.width = width * 2 || 1000
        state.height = width * 2 || 1000
      },
    })

    return () => {
      globe.destroy()
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div className={cn("absolute inset-0 mx-auto aspect-square w-full max-w-[600px]", className)}>
      {/* Removed the opacity transition so it shows up instantly */}
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}
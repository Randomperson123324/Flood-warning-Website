"use client"

import { cn } from "@/lib/utils"
import createGlobe from "cobe"
import { useEffect, useRef } from "react"

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(0)

  useEffect(() => {
    let width = 0
    const canvas = canvasRef.current
    if (!canvas) return

    const onResize = () => {
      if (canvas) width = canvas.offsetWidth
    }
    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.05, 0.05],
      markerColor: [1, 0.3, 0.3],
      glowColor: [1, 0.2, 0.2],
      markers: [
        { location: [14.0583, 100.9479], size: 0.06 }, // Thailand
        { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
        { location: [51.5074, -0.1278], size: 0.05 }, // London
        { location: [40.7128, -74.006], size: 0.05 }, // NYC
        { location: [48.8566, 2.3522], size: 0.05 }, // Paris
        { location: [-33.8688, 151.209], size: 0.05 }, // Sydney
        { location: [22.3193, 114.169], size: 0.05 }, // HK
      ],
      onRender: (state) => {
        phiRef.current += 0.005
        state.phi = phiRef.current
        state.width = width * 2
        state.height = width * 2
      },
    })

    // fade in once WebGL is ready
    setTimeout(() => { canvas.style.opacity = "1" }, 100)

    return () => {
      globe.destroy()
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", aspectRatio: "1", opacity: 0, transition: "opacity 0.6s ease" }}
      className={cn(className)}
    />
  )
}
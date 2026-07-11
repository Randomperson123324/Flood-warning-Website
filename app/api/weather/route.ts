import { type NextRequest, NextResponse } from "next/server"
import { fetchWeather } from "@/lib/weather/weather-provider"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latParam = searchParams.get("lat")
    const lonParam = searchParams.get("lon")
    const label = searchParams.get("label")

    // No env-based default location anymore — lat/lon must come from a real
    // sensor (see hooks/use-sensors.tsx). If the caller doesn't have a
    // sensor yet (no sensors configured / migration not run), that should
    // be surfaced as an error in the UI, not masked by a guessed location.
    if (latParam === null || lonParam === null) {
      return NextResponse.json(
        { error: "Missing lat/lon query parameters — no sensor selected" },
        { status: 400 },
      )
    }

    const lat = Number(latParam)
    const lon = Number(lonParam)

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ error: "Invalid lat/lon query parameters" }, { status: 400 })
    }

    const data = await fetchWeather({ lat, lon, label: label ?? "จุดวัดน้ำ" })
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}

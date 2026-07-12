import { NextResponse, type NextRequest } from "next/server"
import { fetchNearbyRainStations } from "@/lib/gov/thaiwater"

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"))
  const lon = Number(request.nextUrl.searchParams.get("lon"))

  // Sanity-bound to plausible coordinates so garbage input fails fast instead
  // of producing a "nearest" list sorted by nonsense distances.
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 })
  }

  try {
    const stations = await fetchNearbyRainStations(lat, lon)
    return NextResponse.json({ stations, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error("Error fetching nearby gov stations:", error)
    return NextResponse.json({ error: "Failed to fetch nearby stations" }, { status: 500 })
  }
}

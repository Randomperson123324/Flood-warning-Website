import { NextResponse, type NextRequest } from "next/server"
import { searchRainStations, searchRiverStations, searchWarningAlerts } from "@/lib/gov/thaiwater"
import { searchReservoirs } from "@/lib/gov/rid-reservoir"

/** Name search for the community chat gov commands (/rainfall, /river,
 * /floodalert, /reservoir). Lives server-side because the full station
 * feeds are multi-MB and already cached here — the client payload only
 * carries the top-N lists, which aren't searchable in any useful way. */
export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind")
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)

  if (!q) return NextResponse.json({ results: [] })

  try {
    switch (kind) {
      case "rainfall":
        return NextResponse.json({ results: await searchRainStations(q) })
      case "river":
        return NextResponse.json({ results: await searchRiverStations(q) })
      case "floodalert":
        return NextResponse.json({ results: await searchWarningAlerts(q) })
      case "reservoir":
        return NextResponse.json({ results: await searchReservoirs(q) })
      default:
        return NextResponse.json({ error: "Invalid kind" }, { status: 400 })
    }
  } catch (error) {
    console.error("Gov search failed:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

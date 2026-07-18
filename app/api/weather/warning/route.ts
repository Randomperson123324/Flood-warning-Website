import { NextResponse } from "next/server"
import { fetchTMDWarning } from "@/lib/weather/tmd-warning"

// Keep this handler dynamic — the underlying fetches manage their own caching;
// static prerendering would freeze the warning at build time.
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await fetchTMDWarning()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching TMD warning:", error)
    return NextResponse.json({ error: "Failed to fetch weather warnings" }, { status: 500 })
  }
}

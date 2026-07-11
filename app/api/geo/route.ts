import { NextRequest, NextResponse } from "next/server"

// IP-based geolocation fallback — used only when the browser denies/lacks
// GPS. Runs server-side because the free providers below key off the
// *caller's* IP: if this ran client-side it would just report the IP of
// whichever provider's edge the browser happened to hit, not the visitor.
//
// Provider chain (no API key required for either):
//   1. ipapi.co   — https, ~30k req/month free
//   2. ip-api.com — http only on the free tier, used as a fallback
//
// Docs: https://ipapi.co/api/  •  https://ip-api.com/docs/api:json

function extractClientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return null
}

async function fetchFromIpApiCo(ip: string | null) {
  const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/"
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`ipapi.co error: ${res.status}`)
  const data = await res.json()
  if (data.error || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    throw new Error(data.reason ?? "ipapi.co returned no coordinates")
  }
  return { lat: data.latitude as number, lon: data.longitude as number, city: data.city as string | undefined }
}

async function fetchFromIpApiCom(ip: string | null) {
  const query = ip ?? ""
  const url = `http://ip-api.com/json/${query}?fields=status,message,lat,lon,city`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`ip-api.com error: ${res.status}`)
  const data = await res.json()
  if (data.status !== "success" || typeof data.lat !== "number" || typeof data.lon !== "number") {
    throw new Error(data.message ?? "ip-api.com returned no coordinates")
  }
  return { lat: data.lat as number, lon: data.lon as number, city: data.city as string | undefined }
}

export async function GET(req: NextRequest) {
  const ip = extractClientIp(req)
  // Local dev IPs can't be geolocated by either provider — let the caller's
  // own "omit ip" behavior (uses the request's public IP) handle it instead.
  const isLocal = ip === "127.0.0.1" || ip === "::1" || !ip
  const lookupIp = isLocal ? null : ip

  try {
    const result = await fetchFromIpApiCo(lookupIp)
    return NextResponse.json({ ...result, source: "ipapi.co" })
  } catch {
    try {
      const result = await fetchFromIpApiCom(lookupIp)
      return NextResponse.json({ ...result, source: "ip-api.com" })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "IP geolocation failed" },
        { status: 502 },
      )
    }
  }
}

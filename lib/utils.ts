import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Unique-enough ID for client-side dedup keys (Supabase channel names,
 * anonymous visitor IDs). Deliberately NOT crypto.randomUUID() — that API
 * only exists in secure contexts (https:// or literally http://localhost),
 * and throws "crypto.randomUUID is not a function" when the dev server is
 * reached through any other hostname over plain HTTP (e.g. a LAN/tunnel
 * hostname during mobile testing). This works everywhere. */
export function uniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Great-circle distance between two lat/lon points, in kilometers. */
export function haversineDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

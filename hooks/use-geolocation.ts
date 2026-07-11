"use client"

import { useCallback, useEffect, useState } from "react"
import { SITE_CONFIG } from "@/lib/config"
import type { UserLocation } from "@/types"

export type GeolocationStatus = "resolving" | "resolved" | "unavailable"

interface GeolocationState {
  location: UserLocation | null
  status: GeolocationStatus
}

async function resolveViaGps(): Promise<UserLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation API not available")
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          source: "gps",
          accuracyMeters: position.coords.accuracy,
        })
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: SITE_CONFIG.geolocation.gpsTimeoutMs,
        maximumAge: SITE_CONFIG.geolocation.gpsMaxAgeMs,
      },
    )
  })
}

async function resolveViaIp(): Promise<UserLocation | null> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data.lat !== "number" || typeof data.lon !== "number") return null
    return { lat: data.lat, lon: data.lon, source: "ip", approximateCity: data.city }
  } catch {
    return null
  }
}

/**
 * Resolves the visitor's location fresh on every mount (per the brief: no
 * cross-session caching by default — see SITE_CONFIG.geolocation).
 * GPS is tried first; on denial/timeout/unsupported it falls back to an
 * IP-based lookup, which is clearly marked as lower-accuracy downstream
 * (the UI must say so — see components/dashboard/location-banner.tsx).
 */
export function useGeolocation(): GeolocationState & { retry: () => void } {
  const [state, setState] = useState<GeolocationState>({ location: null, status: "resolving" })
  const [attempt, setAttempt] = useState(0)

  const resolve = useCallback(async () => {
    setState({ location: null, status: "resolving" })
    try {
      const gps = await resolveViaGps()
      setState({ location: gps, status: "resolved" })
      return
    } catch {
      // fall through to IP-based lookup
    }

    const ip = await resolveViaIp()
    if (ip) {
      setState({ location: ip, status: "resolved" })
    } else {
      setState({ location: null, status: "unavailable" })
    }
  }, [])

  useEffect(() => {
    resolve()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

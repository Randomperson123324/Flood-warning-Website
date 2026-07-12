/**
 * ThaiWater public API (api-v3.thaiwater.net) — the National Hydroinformatics
 * Data Center operated by HII (สสน.), a Thai government agency that aggregates
 * rain/water telemetry from DWR, RID, EGAT and others. The /public endpoints
 * used here need no API key.
 *
 * Upstream responses are cached via Next's fetch revalidation because the
 * rainfall feed is ~4.5 MB — every visitor hitting it directly would be both
 * slow and rude to a free government service.
 */

import { SITE_CONFIG } from "@/lib/config"
import { haversineDistanceKm } from "@/lib/utils"

export interface GovWarningMessage {
  datetime: string
  message: string
}

export interface GovRainStation {
  stationName: string
  province: { th: string; en: string }
  amphoe: { th: string; en: string }
  agency: { th: string; en: string }
  rain24h: number
  datetime: string
}

export interface GovNearbyStation extends GovRainStation {
  distanceKm: number
}

interface LocalizedName {
  th?: string
  en?: string
}

interface RawRainStation {
  rain_24h: number | null
  rainfall_datetime: string
  agency?: { agency_shortname?: LocalizedName; agency_name?: LocalizedName }
  geocode?: { province_name?: LocalizedName; amphoe_name?: LocalizedName }
  station?: { tele_station_name?: LocalizedName; tele_station_lat?: number | null; tele_station_long?: number | null }
}

const THAIWATER_BASE = "https://api-v3.thaiwater.net/api/v1/thaiwater30/public"

/** TMD 24h rainfall intensity criteria: heavy = 35.1–90 mm, very heavy > 90.
 * Shared by every UI that color-codes rain amounts. */
export const RAIN_HEAVY_MM = 35
export const RAIN_VERY_HEAVY_MM = 90

export async function fetchGovWarnings(): Promise<GovWarningMessage[]> {
  const response = await fetch(`${THAIWATER_BASE}/warning`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`ThaiWater warning API error: ${response.status}`)

  const json = (await response.json()) as { data?: GovWarningMessage[] }
  return (json.data ?? []).filter((w) => w.message)
}

async function fetchRainFeed(): Promise<RawRainStation[]> {
  const response = await fetch(`${THAIWATER_BASE}/rain_24h`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`ThaiWater rain API error: ${response.status}`)

  const json = (await response.json()) as { data?: RawRainStation[] }
  return json.data ?? []
}

function toGovRainStation(s: RawRainStation): GovRainStation {
  return {
    stationName: s.station?.tele_station_name?.th ?? s.station?.tele_station_name?.en ?? "",
    province: {
      th: s.geocode?.province_name?.th ?? "",
      en: s.geocode?.province_name?.en ?? s.geocode?.province_name?.th ?? "",
    },
    amphoe: {
      th: s.geocode?.amphoe_name?.th ?? "",
      en: s.geocode?.amphoe_name?.en ?? s.geocode?.amphoe_name?.th ?? "",
    },
    agency: {
      th: s.agency?.agency_name?.th ?? "",
      en: s.agency?.agency_name?.en ?? s.agency?.agency_name?.th ?? "",
    },
    rain24h: s.rain_24h ?? 0,
    datetime: s.rainfall_datetime,
  }
}

export async function fetchTopRainfall(): Promise<GovRainStation[]> {
  const stations = await fetchRainFeed()
  return stations
    .filter((s) => typeof s.rain_24h === "number" && s.rain_24h > 0)
    .sort((a, b) => (b.rain_24h ?? 0) - (a.rain_24h ?? 0))
    .slice(0, SITE_CONFIG.fetch.govRainTopStations)
    .map(toGovRainStation)
}

// ─── River water levels (waterlevel_load) ──────────────────────────────────

/** ThaiWater's official 5-step situation scale for river stations:
 * 1 = critically low … 3 = normal, 4 = high (น้ำมาก), 5 = overflowing (ล้นตลิ่ง). */
export const RIVER_HIGH_LEVEL = 4
export const RIVER_OVERFLOW_LEVEL = 5

export interface GovRiverStation {
  stationName: string
  river: string
  province: { th: string; en: string }
  amphoe: { th: string; en: string }
  waterlevelMsl: number | null
  /** % of bank capacity — >100 means over the bank. */
  storagePercent: number | null
  situationLevel: number
  datetime: string
}

export interface GovRiverSituation {
  totalStations: number
  overflowCount: number
  highCount: number
  /** Stations at situation level >= 4, worst first. */
  critical: GovRiverStation[]
}

interface RawRiverStation {
  waterlevel_datetime: string
  waterlevel_msl: string | number | null
  storage_percent: string | number | null
  situation_level?: number | null
  river_name?: string | null
  geocode?: { province_name?: LocalizedName; amphoe_name?: LocalizedName }
  station?: { tele_station_name?: LocalizedName }
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function fetchRiverSituation(): Promise<GovRiverSituation> {
  const response = await fetch(`${THAIWATER_BASE}/waterlevel_load`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`ThaiWater waterlevel API error: ${response.status}`)

  const json = (await response.json()) as { waterlevel_data?: { data?: RawRiverStation[] } }
  const stations = (json.waterlevel_data?.data ?? []).filter((s) => typeof s.situation_level === "number")

  const critical = stations
    .filter((s) => (s.situation_level as number) >= RIVER_HIGH_LEVEL)
    .map((s) => ({
      stationName: s.station?.tele_station_name?.th ?? s.station?.tele_station_name?.en ?? "",
      river: s.river_name ?? "",
      province: {
        th: s.geocode?.province_name?.th ?? "",
        en: s.geocode?.province_name?.en ?? s.geocode?.province_name?.th ?? "",
      },
      amphoe: {
        th: s.geocode?.amphoe_name?.th ?? "",
        en: s.geocode?.amphoe_name?.en ?? s.geocode?.amphoe_name?.th ?? "",
      },
      waterlevelMsl: toNumber(s.waterlevel_msl),
      storagePercent: toNumber(s.storage_percent),
      situationLevel: s.situation_level as number,
      datetime: s.waterlevel_datetime,
    }))
    .sort((a, b) => b.situationLevel - a.situationLevel || (b.storagePercent ?? 0) - (a.storagePercent ?? 0))
    .slice(0, SITE_CONFIG.fetch.govRiverStations)

  return {
    totalStations: stations.length,
    overflowCount: stations.filter((s) => s.situation_level === RIVER_OVERFLOW_LEVEL).length,
    highCount: stations.filter((s) => s.situation_level === RIVER_HIGH_LEVEL).length,
    critical,
  }
}

/** Nearest reporting HII stations to a point — powers the "stations near you"
 * section on the dashboard (GPS-granted visitors only). Distance is computed
 * here rather than client-side so the 4.5 MB feed never leaves the server. */
export async function fetchNearbyRainStations(lat: number, lon: number): Promise<GovNearbyStation[]> {
  const stations = await fetchRainFeed()
  return stations
    .filter(
      (s) =>
        typeof s.rain_24h === "number" &&
        typeof s.station?.tele_station_lat === "number" &&
        typeof s.station?.tele_station_long === "number",
    )
    .map((s) => ({
      ...toGovRainStation(s),
      distanceKm: haversineDistanceKm(
        { lat, lon },
        { lat: s.station!.tele_station_lat as number, lon: s.station!.tele_station_long as number },
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, SITE_CONFIG.fetch.govNearbyStations)
}

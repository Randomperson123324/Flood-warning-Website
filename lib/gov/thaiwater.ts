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

/** One parsed alert from the warning feed. Each feed entry's `message` is a
 * batch of alerts separated by blank lines, each following the grammar
 * "[เสี่ยงเกิดน้ำท่วมฉับพลัน] ฝนตกหนัก(มาก) สถานี<station> ต.<tambon> อ.<amphoe>
 * จ.<province> ฝน<window>[<range>] <amount> มม." — parsed here so the UI can
 * show scannable cards instead of raw text walls. */
export interface GovWarningAlert {
  datetime: string
  flashFloodRisk: boolean
  veryHeavy: boolean
  station: string
  tambon: string
  amphoe: string
  province: string
  /** Measurement window, e.g. "1ชม.", "สะสม", "3วัน", "วานนี้". */
  periodType: string
  /** The window's time range as printed in the feed, e.g. "13กค69 09-10น.". */
  periodRange: string
  amountMm: number
  /** The original feed segment — the UI's "raw text" view, and the only
   * readable form when `parsed` is false. */
  raw: string
  /** False when the segment didn't match the grammar (fields above are empty). */
  parsed: boolean
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

/** Cap for name-search results (community chat gov commands). */
const SEARCH_LIMIT = 10

/** TMD 24h rainfall intensity criteria: heavy = 35.1–90 mm, very heavy > 90.
 * Shared by every UI that color-codes rain amounts. */
export const RAIN_HEAVY_MM = 35
export const RAIN_VERY_HEAVY_MM = 90

const WARNING_ALERT_RE =
  /^(?:\[(.+?)\]\s*)?(ฝนตกหนักมาก|ฝนตกหนัก)\s+สถานี(.+?)\s+ต\.(\S+)\s+อ\.(\S+)\s+จ\.(\S+)\s+ฝน(.+?)\[(.+?)\]\s*([\d.]+)\s*มม/

function parseWarningAlert(segment: string, datetime: string): GovWarningAlert {
  const m = segment.match(WARNING_ALERT_RE)
  if (!m) {
    return {
      datetime,
      flashFloodRisk: false,
      veryHeavy: false,
      station: "",
      tambon: "",
      amphoe: "",
      province: "",
      periodType: "",
      periodRange: "",
      amountMm: 0,
      raw: segment,
      parsed: false,
    }
  }
  return {
    datetime,
    flashFloodRisk: Boolean(m[1]),
    veryHeavy: m[2] === "ฝนตกหนักมาก",
    station: m[3],
    tambon: m[4],
    amphoe: m[5],
    province: m[6],
    periodType: m[7],
    periodRange: m[8],
    amountMm: Number(m[9]),
    raw: segment,
    parsed: true,
  }
}

export async function fetchGovWarnings(): Promise<GovWarningAlert[]> {
  const response = await fetch(`${THAIWATER_BASE}/warning`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`ThaiWater warning API error: ${response.status}`)

  const json = (await response.json()) as { data?: GovWarningMessage[] }
  return (json.data ?? [])
    .filter((w) => w.message)
    .flatMap((w) =>
      w.message
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((segment) => parseWarningAlert(segment, w.datetime)),
    )
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

/** Rain stations matched by station/amphoe/province name (Thai or English),
 * wettest first — backs the chat `/rainfall <name>` search. Server-side
 * because only the server has the full (cached) multi-MB feed. */
export async function searchRainStations(query: string): Promise<GovRainStation[]> {
  const q = query.toLowerCase()
  const stations = await fetchRainFeed()
  return stations
    .map(toGovRainStation)
    .filter((s) =>
      [s.stationName, s.amphoe.th, s.amphoe.en, s.province.th, s.province.en].some((v) =>
        v.toLowerCase().includes(q),
      ),
    )
    .sort((a, b) => b.rain24h - a.rain24h)
    .slice(0, SEARCH_LIMIT)
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

async function fetchRiverFeed(): Promise<RawRiverStation[]> {
  const response = await fetch(`${THAIWATER_BASE}/waterlevel_load`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`ThaiWater waterlevel API error: ${response.status}`)

  const json = (await response.json()) as { waterlevel_data?: { data?: RawRiverStation[] } }
  return (json.waterlevel_data?.data ?? []).filter((s) => typeof s.situation_level === "number")
}

function toGovRiverStation(s: RawRiverStation): GovRiverStation {
  return {
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
  }
}

export async function fetchRiverSituation(): Promise<GovRiverSituation> {
  const stations = await fetchRiverFeed()

  const critical = stations
    .filter((s) => (s.situation_level as number) >= RIVER_HIGH_LEVEL)
    .map(toGovRiverStation)
    .sort((a, b) => b.situationLevel - a.situationLevel || (b.storagePercent ?? 0) - (a.storagePercent ?? 0))
    .slice(0, SITE_CONFIG.fetch.govRiverStations)

  return {
    totalStations: stations.length,
    overflowCount: stations.filter((s) => s.situation_level === RIVER_OVERFLOW_LEVEL).length,
    highCount: stations.filter((s) => s.situation_level === RIVER_HIGH_LEVEL).length,
    critical,
  }
}

/** River stations matched by station/river/amphoe/province name — includes
 * normal-level stations (unlike the situation summary, which only lists
 * high/overflowing ones), worst first. */
export async function searchRiverStations(query: string): Promise<GovRiverStation[]> {
  const q = query.toLowerCase()
  const stations = await fetchRiverFeed()
  return stations
    .map(toGovRiverStation)
    .filter((s) =>
      [s.stationName, s.river, s.amphoe.th, s.amphoe.en, s.province.th, s.province.en].some((v) =>
        v.toLowerCase().includes(q),
      ),
    )
    .sort((a, b) => b.situationLevel - a.situationLevel || (b.storagePercent ?? 0) - (a.storagePercent ?? 0))
    .slice(0, SEARCH_LIMIT)
}

/** Current alerts matched by station/tambon/amphoe/province name, most
 * urgent first. Unparseable alerts are skipped — they can't be attributed
 * to a place. */
export async function searchWarningAlerts(query: string): Promise<GovWarningAlert[]> {
  const q = query.toLowerCase()
  const alerts = await fetchGovWarnings()
  return alerts
    .filter(
      (a) =>
        a.parsed &&
        [a.station, a.tambon, a.amphoe, a.province].some((v) => v.toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        Number(b.flashFloodRisk) - Number(a.flashFloodRisk) || Number(b.veryHeavy) - Number(a.veryHeavy),
    )
    .slice(0, SEARCH_LIMIT)
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

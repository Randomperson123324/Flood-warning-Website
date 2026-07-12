import { NextResponse } from "next/server"
import { fetchTMDAnnouncements, type GovAnnouncement } from "@/lib/gov/tmd-news"
import { fetchTMDDailyForecast, type GovDailyForecast } from "@/lib/gov/tmd-forecast"
import {
  fetchGovWarnings,
  fetchRiverSituation,
  fetchTopRainfall,
  type GovRainStation,
  type GovRiverSituation,
  type GovWarningMessage,
} from "@/lib/gov/thaiwater"

export interface GovDataPayload {
  /** null = that agency's feed failed; empty array/object = feed worked but nothing active */
  announcements: GovAnnouncement[] | null
  forecast: GovDailyForecast | null
  waterWarnings: GovWarningMessage[] | null
  riverSituation: GovRiverSituation | null
  rainfall: GovRainStation[] | null
  timestamp: string
}

// Sections fail independently — one agency being down shouldn't blank the
// whole Government Data Center page.
export async function GET() {
  const [announcements, forecast, waterWarnings, riverSituation, rainfall] = await Promise.allSettled([
    fetchTMDAnnouncements(),
    fetchTMDDailyForecast(),
    fetchGovWarnings(),
    fetchRiverSituation(),
    fetchTopRainfall(),
  ])

  for (const result of [announcements, forecast, waterWarnings, riverSituation, rainfall]) {
    if (result.status === "rejected") console.error("Gov data source failed:", result.reason)
  }

  const payload: GovDataPayload = {
    announcements: announcements.status === "fulfilled" ? announcements.value : null,
    forecast: forecast.status === "fulfilled" ? forecast.value : null,
    waterWarnings: waterWarnings.status === "fulfilled" ? waterWarnings.value : null,
    riverSituation: riverSituation.status === "fulfilled" ? riverSituation.value : null,
    rainfall: rainfall.status === "fulfilled" ? rainfall.value : null,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(payload)
}

/**
 * Weather Provider
 *
 * AI calls get_weather() — it never knows which source is used.
 * Priority: TMD → Open-Meteo (fallback)
 *
 * Location is now a parameter (sensor lat/lon/label from the `sensors`
 * table), not a fixed module-level constant read from .env. This is what
 * makes multi-sensor support possible — each sensor can have its own
 * weather fetched for its own coordinates.
 */

import { fetchFromOpenMeteo } from "@/lib/weather/open-meteo"
import { SITE_CONFIG } from "@/lib/config"
import type { WeatherData } from "@/types"

export interface WeatherLocation {
  lat: number
  lon: number
  label: string
}

// In-memory server-side cache, keyed per sensor location. Without this,
// every single request to /api/weather (from any user/tab) triggered a
// fresh outbound call to TMD's API, which is slow and rate-limit-prone. TTL
// matches the client refresh interval, so requests within that window get
// the same cached result instead of hammering TMD.
const weatherCache = new Map<string, { data: WeatherData; fetchedAt: number }>()

function cacheKey(loc: WeatherLocation): string {
  return `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`
}

function isCacheValid(entry: { data: WeatherData; fetchedAt: number } | undefined): boolean {
  return entry !== undefined && Date.now() - entry.fetchedAt < SITE_CONFIG.fetch.weatherRefreshIntervalMs
}

async function fetchFromTMD(loc: WeatherLocation): Promise<WeatherData> {
  const apiToken = process.env.TMD_API_TOKEN
  if (!apiToken || apiToken.length < 10) {
    throw new Error("TMD_API_TOKEN not configured or invalid")
  }
  const { lat, lon, label: cityName } = loc

  const now = new Date()
  const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const dateStr =
    bangkokTime.getFullYear() +
    "-" +
    String(bangkokTime.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(bangkokTime.getDate()).padStart(2, "0")
  const currentHour = bangkokTime.getHours()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SITE_CONFIG.fetch.weatherApiTimeoutMs)

  try {
    const hourlyUrl = `https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat=${lat}&lon=${lon}&fields=tc,rh,cond,ws10m,rain&date=${dateStr}&hour=${currentHour}&duration=${SITE_CONFIG.fetch.hourlyForecastCount}`
    const hourlyResponse = await fetch(hourlyUrl, {
      signal: controller.signal,
      headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    })

    clearTimeout(timeout)

    if (!hourlyResponse.ok) {
      throw new Error(`TMD API error: ${hourlyResponse.status}`)
    }

    const hourlyData = await hourlyResponse.json()
    const forecasts: TMDForecastItem[] = hourlyData.WeatherForecasts?.[0]?.forecasts ?? []
    if (forecasts.length === 0) throw new Error("No TMD forecast data")

    const currentData = forecasts[0].data
    const futureForecasts = forecasts.filter((item) => {
      const itemTime = new Date(item.time)
      return itemTime.getTime() >= bangkokTime.getTime() - 59 * 60 * 1000
    })

    // Fetch daily forecast
    const dailyController = new AbortController()
    const dailyTimeout = setTimeout(() => dailyController.abort(), SITE_CONFIG.fetch.weatherApiTimeoutMs)
    const dailyUrl = `https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at?lat=${lat}&lon=${lon}&fields=tc_max,tc_min,rh,cond,rain&date=${dateStr}&duration=${SITE_CONFIG.fetch.dailyForecastDays}`
    const dailyResponse = await fetch(dailyUrl, {
      signal: dailyController.signal,
      headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    })
    clearTimeout(dailyTimeout)

    let dailyForecast: WeatherData["forecast"] = []
    if (dailyResponse.ok) {
      const dailyData = await dailyResponse.json()
      const dailyItems: TMDDailyItem[] = dailyData.WeatherForecasts?.[0]?.forecasts ?? []
      dailyForecast = dailyItems.map((item) => {
        const desc = getWeatherDescription(item.data.cond)
        return {
          date: item.time,
          tempMax: typeof item.data.tc_max === "number" ? Math.round(item.data.tc_max) : undefined,
          tempMin: typeof item.data.tc_min === "number" ? Math.round(item.data.tc_min) : undefined,
          description: desc.en,
          descriptionTh: desc.th,
          icon: getWeatherIcon(item.data.cond),
          precipitation: item.data.rain ?? 0,
        }
      })
    }

    const currentDesc = getWeatherDescription(currentData.cond)
    return {
      city: cityName,
      country: "TH",
      coordinates: { lat, lon },
      current: {
        temp: typeof currentData.tc === "number" ? Math.round(currentData.tc) : undefined,
        humidity: typeof currentData.rh === "number" ? Math.round(currentData.rh) : undefined,
        windSpeed: typeof currentData.ws10m === "number" ? currentData.ws10m : undefined,
        description: currentDesc.en,
        descriptionTh: currentDesc.th,
        icon: getWeatherIcon(currentData.cond),
        rain: {
          "1h": typeof currentData.rain === "number" ? currentData.rain : 0,
          "24h": dailyForecast.length > 0 ? (dailyForecast[0].precipitation ?? 0) : 0,
        },
      },
      forecast: dailyForecast,
      hourly: futureForecasts.slice(0, SITE_CONFIG.fetch.hourlyForecastCount).map((item) => {
        const desc = getWeatherDescription(item.data.cond)
        return {
          time: item.time,
          temp: Math.round(item.data.tc),
          description: desc.en,
          descriptionTh: desc.th,
          icon: getWeatherIcon(item.data.cond),
          precipitation: item.data.rain ?? 0,
          humidity: Math.round(item.data.rh),
          windSpeed: item.data.ws10m ?? undefined,
        }
      }),
      timestamp: new Date().toISOString(),
      source: "Thai Meteorological Department (TMD)",
    }
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

/**
 * Public API: TMD first, Open-Meteo as fallback. Cached per-location to
 * avoid hammering TMD. `loc` is required — there is no env-based default
 * location anymore. Callers must always pass real sensor coordinates from
 * the `sensors` table.
 */
export async function fetchWeather(loc: WeatherLocation): Promise<WeatherData> {
  const key = cacheKey(loc)
  const cached = weatherCache.get(key)
  if (isCacheValid(cached) && cached) {
    return cached.data
  }

  let data: WeatherData
  try {
    data = await fetchFromTMD(loc)
  } catch (err) {
    console.error("TMD fetch failed, falling back to Open-Meteo:", err instanceof Error ? err.message : err)
    data = await fetchFromOpenMeteo(loc.lat, loc.lon, loc.label)
  }

  weatherCache.set(key, { data, fetchedAt: Date.now() })
  return data
}

// ─── TMD helpers ──────────────────────────────────────────────────────────────

interface TMDForecastItem {
  time: string
  data: { tc: number; rh: number; cond: number; ws10m: number; rain: number }
}
interface TMDDailyItem {
  time: string
  data: { tc_max: number; tc_min: number; rh: number; cond: number; rain: number }
}

function getWeatherDescription(cond: number | undefined): { en: string; th: string } {
  if (!cond) return { en: "Partly Cloudy", th: "มีเมฆบางส่วน" }
  const map: Record<number, { en: string; th: string }> = {
    1: { en: "Clear", th: "ท้องฟ้าแจ่มใส" },
    2: { en: "Partly Cloudy", th: "มีเมฆบางส่วน" },
    3: { en: "Cloudy", th: "เมฆเป็นส่วนมาก" },
    4: { en: "Overcast", th: "มีเมฆมาก" },
    5: { en: "Light Rain", th: "ฝนตกเล็กน้อย" },
    6: { en: "Moderate Rain", th: "ฝนปานกลาง" },
    7: { en: "Heavy Rain", th: "ฝนตกหนัก" },
    8: { en: "Thunderstorm", th: "ฝนฟ้าคะนอง" },
    9: { en: "Very Cold", th: "อากาศหนาวจัด" },
    10: { en: "Cold", th: "อากาศหนาว" },
    11: { en: "Cool", th: "อากาศเย็น" },
    12: { en: "Very Hot", th: "อากาศร้อนจัด" },
  }
  return map[cond] ?? { en: "Partly Cloudy", th: "มีเมฆบางส่วน" }
}

function getWeatherIcon(cond: number | undefined): string {
  if (!cond) return "02d"
  if (cond === 1) return "01d"
  if (cond === 2) return "02d"
  if (cond === 3) return "03d"
  if (cond === 4) return "04d"
  if (cond === 5) return "09d"
  if (cond === 6 || cond === 7) return "10d"
  if (cond === 8) return "11d"
  return "02d"
}

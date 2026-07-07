import { SITE_CONFIG } from "@/lib/config"
import type { WeatherData } from "@/types"

function getDescFromCode(code: number): { en: string; th: string } {
  if (code === 0) return { en: "Clear", th: "ท้องฟ้าแจ่มใส" }
  if (code <= 3) return { en: "Partly Cloudy", th: "มีเมฆบางส่วน" }
  if (code <= 49) return { en: "Foggy", th: "หมอก" }
  if (code <= 59) return { en: "Drizzle", th: "ฝนปรอย" }
  if (code <= 69) return { en: "Rain", th: "ฝนตก" }
  if (code <= 79) return { en: "Snow", th: "หิมะ" }
  if (code <= 82) return { en: "Rain Showers", th: "ฝนตกหนัก" }
  return { en: "Thunderstorm", th: "ฝนฟ้าคะนอง" }
}

export async function fetchFromOpenMeteo(lat: number, lon: number, cityName: string): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", lat.toString())
  url.searchParams.set("longitude", lon.toString())
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code")
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,rain,weather_code,relative_humidity_2m,wind_speed_10m")
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum")
  url.searchParams.set("timezone", "Asia/Bangkok")
  url.searchParams.set("forecast_days", SITE_CONFIG.fetch.dailyForecastDays.toString())

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
  const data = await res.json()

  const currentCode = data.current.weather_code
  const desc = getDescFromCode(currentCode)

  return {
    city: cityName,
    country: "TH",
    coordinates: { lat, lon },
    current: {
      temp: Math.round(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      windSpeed: data.current.wind_speed_10m,
      description: desc.en,
      descriptionTh: desc.th,
      icon: "02d",
      rain: { "1h": data.current.rain ?? 0, "24h": data.daily?.precipitation_sum?.[0] ?? 0 },
    },
    forecast: (data.daily?.time ?? []).map((date: string, i: number) => {
      const d = getDescFromCode(data.daily.weather_code[i])
      return {
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        description: d.en,
        descriptionTh: d.th,
        icon: "02d",
        precipitation: data.daily.precipitation_sum[i] ?? 0,
      }
    }),
    hourly: (data.hourly?.time ?? []).slice(0, SITE_CONFIG.fetch.hourlyForecastCount).map((time: string, i: number) => {
      const h = getDescFromCode(data.hourly.weather_code[i])
      return {
        time,
        temp: Math.round(data.hourly.temperature_2m[i]),
        description: h.en,
        descriptionTh: h.th,
        icon: "02d",
        precipitation: data.hourly.rain[i] ?? 0,
        humidity: Math.round(data.hourly.relative_humidity_2m[i]),
        windSpeed: data.hourly.wind_speed_10m[i] ?? undefined,
      }
    }),
    timestamp: new Date().toISOString(),
    source: "Open-Meteo (Fallback)",
    fallback: true,
  }
}

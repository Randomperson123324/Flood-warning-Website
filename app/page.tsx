"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { AnnouncementPopup } from "@/components/announcement-popup"
import { TMDWarningBanner } from "@/components/tmd-warning-banner"
import { LocationBanner } from "@/components/dashboard/location-banner"
import { SensorSelector } from "@/components/dashboard/sensor-selector"
import { CurrentStatusCard } from "@/components/dashboard/current-status-card"
import { NearbyGovStations } from "@/components/dashboard/nearby-gov-stations"
import { WaterLevelChart } from "@/components/dashboard/water-level-chart"
import { WeatherCard } from "@/components/dashboard/weather-card"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useSensors } from "@/hooks/use-sensors"
import { useWaterData } from "@/hooks/use-water-data"
import { useWeatherData } from "@/hooks/use-weather-data"
import { useLatestReadings } from "@/hooks/use-latest-readings"
import { useLanguage } from "@/hooks/use-language"
import { useFloodReports } from "@/hooks/use-flood-reports"
import { AssistantLauncher } from "@/components/ai-assistant/assistant-launcher"
import type { AIContext } from "@/types"

// Leaflet touches `window` on import — must never run during SSR.
const SensorMap = dynamic(() => import("@/components/dashboard/sensor-map").then((m) => m.SensorMap), {
  ssr: false,
  loading: () => <div className="glass-panel h-[22rem] animate-pulse" />,
})

export default function DashboardPage() {
  const { t } = useLanguage()
  const { location, status: geoStatus, retry: retryGeo } = useGeolocation()
  const { sensors, sensorsByDistance, recommendedSensor, loading: sensorsLoading, error: sensorsError } = useSensors(location)

  // null = auto-follow the recommended (nearest) sensor; set only when the
  // person explicitly picks one from the dropdown/map. Previously this was
  // also set by an effect on the first recommendation, which raced the GPS
  // fix: sensors resolve before geolocation, so the selection locked onto the
  // first alphabetical sensor and the real "nearest" recommendation arriving
  // moments later never applied. Keeping auto mode as null fixes that — the
  // selection stays dynamic until a manual choice is made.
  const [manualSensorId, setManualSensorId] = useState<string | null>(null)

  const selectedSensor = useMemo(
    () => (manualSensorId ? sensors.find((s) => s.sensor_id === manualSensorId) ?? recommendedSensor : recommendedSensor),
    [sensors, manualSensorId, recommendedSensor],
  )

  const water = useWaterData(selectedSensor ?? null)
  const weather = useWeatherData(selectedSensor ?? null)
  const sensorIds = useMemo(() => sensors.map((s) => s.sensor_id), [sensors])
  const latestBySensorId = useLatestReadings(sensorIds)
  const { reports } = useFloodReports()

  const aiContext = useMemo<AIContext>(() => {
    // ไม่มีเซนเซอร์ (เช่น dev เครื่องเปล่า หรือฐานข้อมูลยังไม่ได้ตั้ง) — ยังเปิด
    // ผู้ช่วย AI ได้ แค่ไม่มีข้อมูลน้ำให้ อ้าง label ตรงๆ ให้โมเดลรู้ว่าไม่มีข้อมูล
    if (!selectedSensor) {
      return {
        sensorLabel: "ไม่มีข้อมูลเซนเซอร์",
        currentLevel: 0,
        warningLevel: 0,
        dangerLevel: 0,
        trend: "stable",
        ratePerHour: 0,
        weather: weather.weather,
        activeFloodReports: reports.length,
      }
    }
    return {
      currentLevel: water.latest?.level ?? 0,
      warningLevel: selectedSensor.warning_level_cm,
      dangerLevel: selectedSensor.danger_level_cm,
      trend: water.trend,
      ratePerHour: water.ratePerHour,
      weather: weather.weather,
      activeFloodReports: reports.length,
      sensorLabel: selectedSensor.label,
      sensorId: selectedSensor.sensor_id,
      sensorLat: selectedSensor.lat,
      sensorLon: selectedSensor.lon,
    }
  }, [selectedSensor, water, weather.weather, reports.length])

  return (
    <main className="min-h-dvh pb-16">
      <Header />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <AnnouncementBanner />
        <TMDWarningBanner />
        <LocationBanner status={geoStatus} location={location} onRetry={retryGeo} />

        {!sensorsLoading && sensors.length === 0 && (
          <div className="glass-panel space-y-2 p-6 text-center text-sm text-ink-soft">
            {sensorsError === "Supabase is not configured" ? (
              <>
                <p className="font-medium text-ink">ยังไม่ได้เชื่อมต่อ Supabase</p>
                <p>
                  ใส่ <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> และ{" "}
                  <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ในไฟล์{" "}
                  <code className="font-mono">.env.local</code> (ดูค่าได้ที่ Supabase dashboard → Settings → API)
                  แล้วรีสตาร์ท dev server
                </p>
              </>
            ) : sensorsError ? (
              <>
                <p className="font-medium text-ink">{t("common", "error")}</p>
                <p className="font-mono text-xs">{sensorsError}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-ink">ยังไม่มีเซนเซอร์ในฐานข้อมูล</p>
                <p>
                  รัน SQL setup ใน{" "}
                  <code className="font-mono">scripts/sql/001_phase1_schema.sql</code> ที่ Supabase SQL editor
                </p>
              </>
            )}
          </div>
        )}

        {selectedSensor && (
          <>
            <div className="flex animate-fade-in-up flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">
                {location ? t("location", "nearestSensor") : t("sensor", "select")}
              </p>
              <SensorSelector sensors={sensorsByDistance} selectedSensorId={selectedSensor.sensor_id} onSelect={setManualSensorId} />
            </div>

            <div className="animate-fade-in-up delay-75">
              <CurrentStatusCard
                sensor={selectedSensor}
                levelCm={water.latest?.level ?? null}
                ratePerHour={water.ratePerHour}
                trend={water.trend}
                severity={water.severity}
                timeToThreshold={water.timeToThreshold}
                lastUpdated={water.latest?.timestamp ?? null}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="animate-fade-in-up delay-150">
                <WaterLevelChart sensor={selectedSensor} history={water.history} />
              </div>
              <div className="animate-fade-in-up delay-200">
                <WeatherCard weather={weather.weather} loading={weather.loading} />
              </div>
            </div>

            <div className="animate-fade-in-up delay-300">
              <SensorMap
                sensors={sensors}
                latestBySensorId={latestBySensorId}
                selectedSensorId={selectedSensor.sensor_id}
                userLocation={location}
                onSelect={setManualSensorId}
              />
            </div>
          </>
        )}

        <NearbyGovStations location={location} status={geoStatus} onRetry={retryGeo} />
      </div>

      <AssistantLauncher context={aiContext} />

      <AnnouncementPopup />
    </main>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { LocationBanner } from "@/components/dashboard/location-banner"
import { SensorSelector } from "@/components/dashboard/sensor-selector"
import { CurrentStatusCard } from "@/components/dashboard/current-status-card"
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
  const { sensors, sensorsByDistance, recommendedSensor, loading: sensorsLoading } = useSensors(location)

  const [manualSensorId, setManualSensorId] = useState<string | null>(null)

  // Auto-follow the recommended (nearest) sensor until the person manually
  // picks one — re-evaluated every time location/sensors resolve, per the
  // "dynamic every visit" requirement.
  useEffect(() => {
    if (!manualSensorId && recommendedSensor) setManualSensorId(recommendedSensor.sensor_id)
  }, [recommendedSensor, manualSensorId])

  const selectedSensor = useMemo(
    () => sensors.find((s) => s.sensor_id === manualSensorId) ?? recommendedSensor,
    [sensors, manualSensorId, recommendedSensor],
  )

  const water = useWaterData(selectedSensor ?? null)
  const weather = useWeatherData(selectedSensor ?? null)
  const sensorIds = useMemo(() => sensors.map((s) => s.sensor_id), [sensors])
  const latestBySensorId = useLatestReadings(sensorIds)
  const { reports } = useFloodReports()

  const aiContext = useMemo<AIContext | null>(() => {
    if (!selectedSensor) return null
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
        <LocationBanner status={geoStatus} location={location} onRetry={retryGeo} />

        {!sensorsLoading && sensors.length === 0 && (
          <div className="glass-panel p-6 text-center text-sm text-ink-soft">
            {t("common", "error")} — no sensors configured yet. Run the SQL setup in{" "}
            <code className="font-mono">scripts/sql/001_schema.sql</code>.
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
      </div>

      {aiContext && <AssistantLauncher context={aiContext} />}
    </main>
  )
}

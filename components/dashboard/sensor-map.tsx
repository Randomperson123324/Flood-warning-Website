"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useTheme } from "next-themes"
import { SITE_CONFIG } from "@/lib/config"
import { computeSeverity } from "@/lib/water-analysis"
import { useLanguage } from "@/hooks/use-language"
import type { Sensor, UserLocation, WaterReading } from "@/types"

// react-leaflet is loaded via next/dynamic(ssr:false) by its caller — this
// file still runs `L.divIcon` at module scope-adjacent time, which is safe
// because it only ever executes client-side once dynamically imported.

interface SensorMapProps {
  sensors: Sensor[]
  latestBySensorId: Record<string, WaterReading | undefined>
  selectedSensorId: string | null
  userLocation: UserLocation | null
  onSelect: (sensorId: string) => void
}

/** react-leaflet only applies MapContainer's `center` prop at mount — this
 * child keeps the view in sync when the selected sensor (or location)
 * changes afterwards, so clicking a sensor actually moves the map. */
function RecenterView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.8 })
  }, [center[0], center[1], map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const SEVERITY_COLOR: Record<string, string> = {
  normal: "--status-normal-rgb",
  warning: "--status-warning-rgb",
  danger: "--status-danger-rgb",
}

function pinIcon(colorVar: string, selected: boolean) {
  const size = selected ? 20 : 14
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:${size}px;height:${size}px;
      border-radius:9999px;background:rgb(var(${colorVar}));
      border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 0 0 4px rgb(var(${colorVar}) / 0.2);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function userIcon() {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:16px;height:16px;border-radius:9999px;
      background:rgb(var(--accent-rgb));border:3px solid white;
      box-shadow:0 0 0 6px rgb(var(--accent-rgb) / 0.28);
    "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export function SensorMap({ sensors, latestBySensorId, selectedSensorId, userLocation, onSelect }: SensorMapProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const tileUrl = resolvedTheme === "dark" ? SITE_CONFIG.map.tileUrlDark : SITE_CONFIG.map.tileUrlLight

  const center = useMemo<[number, number]>(() => {
    const selected = sensors.find((s) => s.sensor_id === selectedSensorId)
    if (selected) return [selected.lat, selected.lon]
    if (userLocation) return [userLocation.lat, userLocation.lon]
    if (sensors[0]) return [sensors[0].lat, sensors[0].lon]
    return [13.7563, 100.5018]
  }, [sensors, selectedSensorId, userLocation])

  return (
    <div className="glass-panel h-[clamp(18rem,55vh,28rem)] overflow-hidden p-1">
      <MapContainer center={center} zoom={SITE_CONFIG.map.defaultZoom} className="h-full w-full rounded-glass">
        <TileLayer url={tileUrl} attribution={SITE_CONFIG.map.tileAttribution} />
        <RecenterView center={center} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon()}>
            <Popup>{t("map", "you")}</Popup>
          </Marker>
        )}

        {sensors.map((sensor) => {
          const reading = latestBySensorId[sensor.sensor_id]
          const severity = reading ? computeSeverity(reading.level, sensor.warning_level_cm, sensor.danger_level_cm) : "normal"
          return (
            <Marker
              key={sensor.sensor_id}
              position={[sensor.lat, sensor.lon]}
              icon={pinIcon(SEVERITY_COLOR[severity], sensor.sensor_id === selectedSensorId)}
              eventHandlers={{ click: () => onSelect(sensor.sensor_id) }}
            >
              <Popup>
                <span className="font-medium">{sensor.label}</span>
                {reading && <div className="font-mono text-xs">{reading.level.toFixed(1)} cm</div>}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

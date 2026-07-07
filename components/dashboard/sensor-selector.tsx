"use client"

import { MapPin } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { GlassDropdown } from "@/components/ui/glass-dropdown"
import type { SensorWithDistance } from "@/types"

interface SensorSelectorProps {
  sensors: SensorWithDistance[]
  selectedSensorId: string | null
  onSelect: (sensorId: string) => void
}

export function SensorSelector({ sensors, selectedSensorId, onSelect }: SensorSelectorProps) {
  const { t } = useLanguage()

  if (sensors.length === 0) return null

  const options = sensors.map((sensor) => ({
    value: sensor.sensor_id,
    label: `${sensor.label}${Number.isFinite(sensor.distanceKm) ? ` · ${sensor.distanceKm.toFixed(1)} ${t("common", "km")}` : ""}`,
  }))

  return (
    <GlassDropdown
      value={selectedSensorId ?? sensors[0].sensor_id}
      onChange={onSelect}
      ariaLabel={t("sensor", "select")}
      triggerIcon={<MapPin className="h-4 w-4 shrink-0 text-accent" />}
      options={options}
      menuClassName="min-w-[16rem]"
    />
  )
}

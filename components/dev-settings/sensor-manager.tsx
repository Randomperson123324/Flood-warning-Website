"use client"

import { useState } from "react"
import { Pencil, Plus, Power, Trash2, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useManageSensors, type SensorInput } from "@/hooks/use-manage-sensors"
import { glassInputClass } from "@/components/auth/auth-shell"
import type { Sensor } from "@/types"

const EMPTY_FORM: SensorInput = {
  sensor_id: "",
  label: "",
  lat: 13.7563,
  lon: 100.5018,
  height_cm: 19,
  warning_level_cm: 5,
  danger_level_cm: 10,
  is_active: true,
  is_default: false,
}

export function SensorManager() {
  const { t } = useLanguage()
  const { sensors, loading, createSensor, updateSensor, deleteSensor } = useManageSensors()
  const [form, setForm] = useState<SensorInput | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function startEdit(sensor: Sensor) {
    setEditingId(sensor.id)
    setForm({
      sensor_id: sensor.sensor_id,
      label: sensor.label,
      lat: sensor.lat,
      lon: sensor.lon,
      height_cm: sensor.height_cm,
      warning_level_cm: sensor.warning_level_cm,
      danger_level_cm: sensor.danger_level_cm,
      is_active: sensor.is_active,
      is_default: sensor.is_default,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setError(null)
    const result = editingId ? await updateSensor(editingId, form) : await createSensor(form)
    if (result.error) {
      setError(result.error)
      return
    }
    setForm(null)
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {form ? (
        <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{editingId ? t("devSettings", "edit") : t("devSettings", "add")}</p>
            <button type="button" onClick={() => { setForm(null); setEditingId(null) }}>
              <X className="h-4 w-4 text-ink-soft" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder={t("devSettings", "sensorId")}
              value={form.sensor_id}
              onChange={(e) => setForm({ ...form, sensor_id: e.target.value })}
              className={glassInputClass}
              disabled={!!editingId}
              required
            />
            <input
              placeholder={t("devSettings", "label")}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className={glassInputClass}
              required
            />
            <input
              type="number"
              step="0.000001"
              placeholder={t("devSettings", "lat")}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
              className={glassInputClass}
              required
            />
            <input
              type="number"
              step="0.000001"
              placeholder={t("devSettings", "lon")}
              value={form.lon}
              onChange={(e) => setForm({ ...form, lon: Number(e.target.value) })}
              className={glassInputClass}
              required
            />
            <input
              type="number"
              step="0.1"
              placeholder={t("devSettings", "heightCm")}
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })}
              className={glassInputClass}
            />
            <input
              type="number"
              step="0.1"
              placeholder={t("devSettings", "warningLevel")}
              value={form.warning_level_cm}
              onChange={(e) => setForm({ ...form, warning_level_cm: Number(e.target.value) })}
              className={glassInputClass}
            />
            <input
              type="number"
              step="0.1"
              placeholder={t("devSettings", "dangerLevel")}
              value={form.danger_level_cm}
              onChange={(e) => setForm({ ...form, danger_level_cm: Number(e.target.value) })}
              className={glassInputClass}
            />
            <label className="glass-panel-strong flex items-center gap-2 px-3.5 py-2.5 text-sm">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              {t("devSettings", "isDefault")}
            </label>
          </div>

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <button type="submit" className="glass-panel-strong py-2.5 text-sm font-medium text-accent">
            {t("devSettings", "save")}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setForm(EMPTY_FORM)}
          className="glass-panel-strong flex w-fit items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent"
        >
          <Plus className="h-4 w-4" />
          {t("devSettings", "add")}
        </button>
      )}

      {!loading && sensors.length === 0 && <p className="text-sm text-ink-soft">{t("devSettings", "noItems")}</p>}

      <div className="flex flex-col gap-2">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="glass-panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {sensor.label} {sensor.is_default && <span className="text-xs text-accent">({t("devSettings", "isDefault")})</span>}
              </p>
              <p className="font-mono text-xs text-ink-soft">
                {sensor.sensor_id} · {sensor.lat.toFixed(4)}, {sensor.lon.toFixed(4)} · ⚠{sensor.warning_level_cm} 🚨{sensor.danger_level_cm}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateSensor(sensor.id, { is_active: !sensor.is_active })}
                className={`rounded-full p-2 ${sensor.is_active ? "text-status-normal" : "text-ink-soft"}`}
                title={sensor.is_active ? t("devSettings", "deactivate") : t("devSettings", "activate")}
              >
                <Power className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => startEdit(sensor)} className="rounded-full p-2 text-ink-soft hover:text-accent">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => confirm(t("devSettings", "confirmDelete")) && deleteSensor(sensor.id)}
                className="rounded-full p-2 text-ink-soft hover:text-status-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

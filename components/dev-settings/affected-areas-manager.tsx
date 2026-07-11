"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useManageAffectedAreas, type AffectedAreaInput } from "@/hooks/use-manage-affected-areas"
import { glassInputClass } from "@/components/auth/auth-shell"
import type { AffectedArea } from "@/types"

const EMPTY_FORM: AffectedAreaInput = {
  name: "",
  water_level_threshold: 5,
  lat: null,
  lon: null,
  description: "",
}

export function AffectedAreasManager() {
  const { t } = useLanguage()
  const { areas, loading, createArea, updateArea, deleteArea } = useManageAffectedAreas()
  const [form, setForm] = useState<AffectedAreaInput | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function startEdit(area: AffectedArea) {
    setEditingId(area.id)
    setForm({ name: area.name, water_level_threshold: area.water_level_threshold, lat: area.lat, lon: area.lon, description: area.description })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setError(null)
    const result = editingId ? await updateArea(editingId, form) : await createArea(form)
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

          <input
            placeholder={t("devSettings", "areaName")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={glassInputClass}
            required
          />
          <input
            type="number"
            step="0.1"
            placeholder={t("devSettings", "threshold")}
            value={form.water_level_threshold}
            onChange={(e) => setForm({ ...form, water_level_threshold: Number(e.target.value) })}
            className={glassInputClass}
          />
          <textarea
            placeholder={t("devSettings", "description")}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className={`${glassInputClass} resize-none`}
          />

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

      {!loading && areas.length === 0 && <p className="text-sm text-ink-soft">{t("devSettings", "noItems")}</p>}

      <div className="flex flex-col gap-2">
        {areas.map((area) => (
          <div key={area.id} className="glass-panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{area.name}</p>
              <p className="text-xs text-ink-soft">
                {t("devSettings", "threshold")}: {area.water_level_threshold} cm
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => startEdit(area)} className="rounded-full p-2 text-ink-soft hover:text-accent">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => confirm(t("devSettings", "confirmDelete")) && deleteArea(area.id)}
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

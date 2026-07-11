"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Sensor } from "@/types"

export type SensorInput = Omit<Sensor, "id" | "created_at" | "updated_at">

export function useManageSensors() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!supabase) return
    const { data } = await supabase.from("sensors").select("*").order("label")
    setSensors((data as Sensor[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createSensor(input: SensorInput) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("sensors").insert(input)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function updateSensor(id: string, input: Partial<SensorInput>) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("sensors").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function deleteSensor(id: string) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("sensors").delete().eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  return { sensors, loading, createSensor, updateSensor, deleteSensor }
}

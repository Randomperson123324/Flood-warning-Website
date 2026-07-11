"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { AffectedArea } from "@/types"

export type AffectedAreaInput = Omit<AffectedArea, "id" | "created_at" | "updated_at">

export function useManageAffectedAreas() {
  const [areas, setAreas] = useState<AffectedArea[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!supabase) return
    const { data } = await supabase.from("affected_areas").select("*").order("name")
    setAreas((data as AffectedArea[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createArea(input: AffectedAreaInput) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("affected_areas").insert(input)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function updateArea(id: string, input: Partial<AffectedAreaInput>) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("affected_areas").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function deleteArea(id: string) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("affected_areas").delete().eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  return { areas, loading, createArea, updateArea, deleteArea }
}

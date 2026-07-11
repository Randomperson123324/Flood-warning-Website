"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { AffectedArea } from "@/types"

/**
 * Read-only list of affected areas for public consumers (e.g. the flood
 * report form's place picker). Management/CRUD lives in
 * `useManageAffectedAreas`; this hook only reads.
 */
export function useAffectedAreas() {
  const [areas, setAreas] = useState<AffectedArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      const { data } = await supabase!.from("affected_areas").select("*").order("name")
      if (cancelled) return
      setAreas((data as AffectedArea[]) ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { areas, loading }
}

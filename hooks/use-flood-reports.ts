"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { uniqueId } from "@/lib/utils"
import type { FloodReport, ReportSeverity } from "@/types"

interface SubmitReportParams {
  area_name: string
  severity: ReportSeverity
  description: string
  turnstileToken: string
}

export function useFloodReports() {
  const { session } = useAuth()
  const [reports, setReports] = useState<FloodReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured")
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      const { data, error: queryError } = await supabase!
        .from("flood_reports")
        .select("*, users(username)")
        .order("created_at", { ascending: false })
        .limit(100)

      if (cancelled) return
      if (queryError) setError(queryError.message)
      else setReports((data as unknown as FloodReport[]) ?? [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`flood_reports:realtime:${uniqueId()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "flood_reports" }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
  }, [])

  async function submitReport(params: SubmitReportParams): Promise<{ error: string | null }> {
    if (!session) return { error: "not_authenticated" }

    const res = await fetch("/api/flood-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? "submit_failed" }
    return { error: null }
  }

  return { reports, loading, error, submitReport }
}

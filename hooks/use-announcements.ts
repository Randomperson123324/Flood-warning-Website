"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { uniqueId } from "@/lib/utils"
import type { Announcement } from "@/types"

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function load() {
      const { data } = await supabase!
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5)
      if (!cancelled) setAnnouncements((data as Announcement[]) ?? [])
    }

    load()

    const channel = supabase
      .channel(`announcements:realtime:${uniqueId()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
  }, [])

  return announcements
}

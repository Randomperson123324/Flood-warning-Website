"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Announcement } from "@/types"

export type AnnouncementInput = { message: string; type: string; is_active: boolean }

export function useManageAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!supabase) return
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })
    setAnnouncements((data as Announcement[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createAnnouncement(input: AnnouncementInput) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("announcements").insert(input)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function toggleActive(id: number, isActive: boolean) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("announcements").update({ is_active: isActive }).eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function deleteAnnouncement(id: number) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.from("announcements").delete().eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  return { announcements, loading, createAnnouncement, toggleActive, deleteAnnouncement }
}

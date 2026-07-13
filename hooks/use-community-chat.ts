"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { SITE_CONFIG } from "@/lib/config"
import { uniqueId } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import type { ChatMessage, GovCommandKind, Sensor } from "@/types"

interface SendMessageParams {
  content: string
  replyTo?: ChatMessage | null
}

interface UseCommunityChatResult {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  sendMessage: (params: SendMessageParams) => Promise<{ error: string | null }>
  sendAIExchange: (params: { question: string; answer: string }) => Promise<{ error: string | null }>
  sendSensorCard: (sensor: Sensor) => Promise<{ error: string | null }>
  sendGovCard: (kind: GovCommandKind) => Promise<{ error: string | null }>
}

export function useCommunityChat(): UseCommunityChatResult {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
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
        .from("messages")
        .select("*, users(username, role)")
        .order("created_at", { ascending: false })
        .limit(SITE_CONFIG.community.messagesPageSize)

      if (cancelled) return
      if (queryError) {
        setError(queryError.message)
      } else {
        setMessages(((data as unknown as ChatMessage[]) ?? []).reverse())
        setError(null)
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`messages:realtime:${uniqueId()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        // The realtime payload doesn't include the embedded `users` relation,
        // so re-fetch that single row with the join for a consistent shape.
        const { data } = await supabase!
          .from("messages")
          .select("*, users(username, role)")
          .eq("id", (payload.new as ChatMessage).id)
          .single()
        if (data) setMessages((prev) => [...prev, data as unknown as ChatMessage])
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
  }, [])

  async function sendMessage({ content, replyTo }: SendMessageParams): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Supabase is not configured" }
    if (!user) return { error: "not_authenticated" }
    const trimmed = content.trim()
    if (!trimmed) return { error: null }

    const { error: insertError } = await supabase.from("messages").insert({
      user_id: user.id,
      content: trimmed,
      reply_to: replyTo?.id ?? null,
      reply_to_content: replyTo?.content ?? null,
      reply_to_username: replyTo?.users?.username ?? null,
    })

    if (insertError) {
      const isRateLimited = insertError.message?.includes("RATE_LIMITED")
      return { error: isRateLimited ? "RATE_LIMITED" : insertError.message }
    }
    return { error: null }
  }

  async function sendAIExchange({ question, answer }: { question: string; answer: string }): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Supabase is not configured" }
    if (!user) return { error: "not_authenticated" }

    const { error: insertError } = await supabase.from("messages").insert({
      user_id: user.id,
      type: "ai",
      content: question,
      ai_question: question,
      ai_answer: answer,
    })

    return { error: insertError ? insertError.message : null }
  }

  async function sendSensorCard(sensor: Sensor): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Supabase is not configured" }
    if (!user) return { error: "not_authenticated" }

    const { error: insertError } = await supabase.from("messages").insert({
      user_id: user.id,
      type: "sensor",
      content: sensor.label,
      sensor_id: sensor.sensor_id,
    })

    return { error: insertError ? insertError.message : null }
  }

  /** Like `/sensor`, only the card KIND is persisted — data renders live
   * from the shared /api/gov cache, so old cards show current figures. */
  async function sendGovCard(kind: GovCommandKind): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Supabase is not configured" }
    if (!user) return { error: "not_authenticated" }

    const { error: insertError } = await supabase.from("messages").insert({
      user_id: user.id,
      type: "gov",
      content: `/${kind}`,
      gov_kind: kind,
    })

    return { error: insertError ? insertError.message : null }
  }

  return { messages, loading, error, sendMessage, sendAIExchange, sendSensorCard, sendGovCard }
}

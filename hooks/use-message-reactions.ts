"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { uniqueId } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import type { MessageReaction } from "@/types"

export interface ReactionSummary {
  reaction_type: string
  count: number
  reactedByMe: boolean
}

export function useMessageReactions(messageIds: string[]) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<MessageReaction[]>([])

  const idsKey = messageIds.join(",")

  useEffect(() => {
    if (!supabase || messageIds.length === 0) return
    let cancelled = false

    async function load() {
      const { data } = await supabase!.from("message_reactions").select("*").in("message_id", messageIds)
      if (!cancelled) setReactions((data as MessageReaction[]) ?? [])
    }

    load()

    const channel = supabase
      .channel(`message_reactions:realtime:${uniqueId()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  const byMessage = useMemo(() => {
    const map: Record<string, ReactionSummary[]> = {}
    for (const r of reactions) {
      const bucket = (map[r.message_id] ??= [])
      let entry = bucket.find((b) => b.reaction_type === r.reaction_type)
      if (!entry) {
        entry = { reaction_type: r.reaction_type, count: 0, reactedByMe: false }
        bucket.push(entry)
      }
      entry.count += 1
      if (r.user_id === user?.id) entry.reactedByMe = true
    }
    return map
  }, [reactions, user])

  const toggleReaction = useCallback(
    async (messageId: string, reactionType: string) => {
      if (!supabase || !user) return
      const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.reaction_type === reactionType)

      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id)
      } else {
        await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, reaction_type: reactionType })
      }
    },
    [reactions, user],
  )

  return { byMessage, toggleReaction }
}

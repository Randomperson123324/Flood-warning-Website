"use client"

import { useEffect, useState } from "react"
import { SITE_CONFIG } from "@/lib/config"
import { uniqueId } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

const VISITOR_ID_KEY = "streeflood:weather-visitor-id"
const LAST_VOTE_KEY = "streeflood:weather-last-vote"

function getOrCreateVisitorId(): string {
  let id = window.localStorage.getItem(VISITOR_ID_KEY)
  if (!id) {
    id = uniqueId()
    window.localStorage.setItem(VISITOR_ID_KEY, id)
  }
  return id
}

interface VoteTally {
  totalValidVotes: number
  rainVotes: number
  rainPercentage: number
  isRaining: boolean
}

export function useWeatherVote(location: string) {
  const { session } = useAuth()
  const [tally, setTally] = useState<VoteTally | null>(null)
  const [hasVotedRecently, setHasVotedRecently] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const lastVote = Number(window.localStorage.getItem(LAST_VOTE_KEY) ?? 0)
    setHasVotedRecently(Date.now() - lastVote < SITE_CONFIG.community.weatherVoteWindowMs)
    loadTally()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadTally() {
    const res = await fetch("/api/weather/vote")
    if (res.ok) setTally(await res.json())
  }

  async function vote(isRaining: boolean): Promise<{ error: string | null }> {
    setSubmitting(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (session) headers.Authorization = `Bearer ${session.access_token}`

      const res = await fetch("/api/weather/vote", {
        method: "POST",
        headers,
        body: JSON.stringify({
          is_raining: isRaining,
          location,
          visitor_id: session ? undefined : getOrCreateVisitorId(),
        }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error ?? "vote_failed" }

      window.localStorage.setItem(LAST_VOTE_KEY, String(Date.now()))
      setHasVotedRecently(true)
      await loadTally()
      return { error: null }
    } finally {
      setSubmitting(false)
    }
  }

  return { tally, hasVotedRecently, submitting, vote }
}

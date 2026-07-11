/**
 * Search Provider
 *
 * AI calls search_web() — it never knows which backend is used.
 * Primary: Tavily (https://tavily.com) — purpose-built for LLM tool-calling,
 *   returns clean extracted content + a direct answer instead of just links.
 *   Free tier: 1,000 searches/month, no credit card. Set TAVILY_API_KEY.
 * Fallback: DuckDuckGo Instant Answer API — used automatically if no
 *   TAVILY_API_KEY is set, so search still works with zero config, just
 *   with much shallower results (abstract-only, no real page content).
 */

import { SITE_CONFIG } from "@/lib/config"

export interface SearchResultItem {
  title: string
  url: string
  content: string
}

export interface SearchResult {
  answer: string | null
  results: SearchResultItem[]
  source: "tavily" | "duckduckgo"
}

async function searchTavily(query: string): Promise<SearchResult> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: SITE_CONFIG.search.maxResults,
    }),
    cache: "no-store",
  })

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`)
  const data = await res.json()

  return {
    answer: data.answer ?? null,
    results: (data.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content ?? "",
    })),
    source: "tavily",
  }
}

async function searchDuckDuckGo(query: string): Promise<SearchResult> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`DuckDuckGo error: ${res.status}`)
  const data = await res.json()

  const related = (data.RelatedTopics ?? [])
    .slice(0, SITE_CONFIG.search.maxResults)
    .filter((t: { Text?: string; FirstURL?: string }) => t.Text)
    .map((t: { Text?: string; FirstURL?: string }) => ({
      title: t.Text?.split(" - ")[0] ?? "",
      url: t.FirstURL ?? "",
      content: t.Text ?? "",
    }))

  return {
    answer: data.AbstractText || null,
    results: related,
    source: "duckduckgo",
  }
}

/** Public API: Tavily when configured, DuckDuckGo otherwise — no other code
 * needs to know or care which backend answered. */
export async function searchWeb(query: string): Promise<SearchResult> {
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchTavily(query)
    } catch (error) {
      console.error("Tavily search failed, falling back to DuckDuckGo:", error)
    }
  }
  return searchDuckDuckGo(query)
}

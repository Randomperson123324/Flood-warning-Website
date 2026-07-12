/**
 * TMD Weather Warning/Advisory fetcher — shared between /api/weather/warning
 * (used by the banner UI) and the AI tool registry (so the AI assistant can
 * also answer questions about active storm/weather advisories, not just
 * routine forecasts from get_weather).
 */

import { SITE_CONFIG } from "@/lib/config"

export interface TMDWarningData {
  hasWarning: boolean
  issueNo: string
  titleThai: string
  descriptionThai: string
  headlineThai: string
  titleEnglish: string
  descriptionEnglish: string
  headlineEnglish: string
  webUrlThai: string
  webUrlEnglish: string
  timestamp: string
}

export async function fetchTMDWarning(): Promise<TMDWarningData> {
  const { tmdUid, tmdUkey } = SITE_CONFIG.gov
  const response = await fetch(`https://data.tmd.go.th/api/WeatherWarningNews/v2/?uid=${tmdUid}&ukey=${tmdUkey}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`TMD API error: ${response.status}`)
  }

  const xmlText = await response.text()

  const hasWarning = xmlText.includes("<Warning>") || (xmlText.includes("<Warnings>") && !xmlText.includes("<Warnings/>"))

  let issueNo = ""
  let titleThai = ""
  let descriptionThai = ""
  let headlineThai = ""
  let titleEnglish = ""
  let descriptionEnglish = ""
  let headlineEnglish = ""
  let webUrlThai = ""
  let webUrlEnglish = ""

  if (hasWarning) {
    const issueNoMatch = xmlText.match(/<IssueNo>([\s\S]*?)<\/IssueNo>/i)
    const titleThaiMatch = xmlText.match(/<TitleThai>([\s\S]*?)<\/TitleThai>/i)
    const titleEnglishMatches = [...xmlText.matchAll(/<TitleEnglish>([\s\S]*?)<\/TitleEnglish>/ig)]
    const titleEnglishMatch = titleEnglishMatches.length > 0 ? titleEnglishMatches[titleEnglishMatches.length - 1] : null

    const headlineThaiMatch = xmlText.match(/<HeadlineThai>([\s\S]*?)<\/HeadlineThai>/i)
    const headlineEnglishMatches = [...xmlText.matchAll(/<HeadlineEnglish>([\s\S]*?)<\/HeadlineEnglish>/ig)]
    const headlineEnglishMatch = headlineEnglishMatches.length > 0 ? headlineEnglishMatches[headlineEnglishMatches.length - 1] : null

    const descriptionThaiMatch = xmlText.match(/<DescriptionThai>([\s\S]*?)<\/DescriptionThai>/i)
    const descriptionEnglishMatches = [...xmlText.matchAll(/<DescriptionEnglish>([\s\S]*?)<\/DescriptionEnglish>/ig)]
    const descriptionEnglishMatch = descriptionEnglishMatches.length > 0 ? descriptionEnglishMatches[descriptionEnglishMatches.length - 1] : null

    const webUrlThaiMatch = xmlText.match(/<WebUrlThai>([\s\S]*?)<\/WebUrlThai>/i)
    const webUrlEnglishMatches = [...xmlText.matchAll(/<WebUrlEnglish>([\s\S]*?)<\/WebUrlEnglish>/ig)]
    const webUrlEnglishMatch = webUrlEnglishMatches.length > 0 ? webUrlEnglishMatches[webUrlEnglishMatches.length - 1] : null

    const clean = (text: string) => {
      if (!text) return ""
      return text
        .trim()
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    }

    issueNo = issueNoMatch ? clean(issueNoMatch[1]) : ""
    titleThai = titleThaiMatch ? clean(titleThaiMatch[1]) : ""
    descriptionThai = descriptionThaiMatch ? clean(descriptionThaiMatch[1]) : ""
    headlineThai = headlineThaiMatch ? clean(headlineThaiMatch[1]) : ""
    titleEnglish = titleEnglishMatch ? clean(titleEnglishMatch[1]) : ""
    descriptionEnglish = descriptionEnglishMatch ? clean(descriptionEnglishMatch[1]) : ""
    headlineEnglish = headlineEnglishMatch ? clean(headlineEnglishMatch[1]) : ""
    webUrlThai = webUrlThaiMatch ? clean(webUrlThaiMatch[1]) : ""
    webUrlEnglish = webUrlEnglishMatch ? clean(webUrlEnglishMatch[1]) : ""
  }

  return {
    hasWarning,
    issueNo,
    titleThai,
    descriptionThai,
    headlineThai,
    titleEnglish,
    descriptionEnglish,
    headlineEnglish,
    webUrlThai,
    webUrlEnglish,
    timestamp: new Date().toISOString(),
  }
}

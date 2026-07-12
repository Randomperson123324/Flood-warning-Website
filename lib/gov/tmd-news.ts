/**
 * TMD announcement list — parses EVERY <Warning> block from the same
 * WeatherWarningNews feed that lib/weather/tmd-warning.ts uses. That module
 * only surfaces "is there an active advisory" for the dashboard banner; the
 * Government Data Center page wants the full list as news items instead.
 */

import { SITE_CONFIG } from "@/lib/config"
import { tag } from "@/lib/gov/tmd-xml"

export interface GovAnnouncement {
  issueNo: string
  titleThai: string
  titleEnglish: string
  headlineThai: string
  headlineEnglish: string
  descriptionThai: string
  descriptionEnglish: string
  announceDate: string
  effectStart: string
  effectEnd: string
  webUrlThai: string
  webUrlEnglish: string
}

export async function fetchTMDAnnouncements(): Promise<GovAnnouncement[]> {
  const { tmdUid, tmdUkey } = SITE_CONFIG.gov
  const response = await fetch(`https://data.tmd.go.th/api/WeatherWarningNews/v2/?uid=${tmdUid}&ukey=${tmdUkey}`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`TMD API error: ${response.status}`)

  const xmlText = await response.text()
  // `<Warnings/>` (self-closing, empty feed) never matches `<Warning>` here.
  const blocks = [...xmlText.matchAll(/<Warning>([\s\S]*?)<\/Warning>/g)].map((m) => m[1])

  return blocks.map((block) => ({
    issueNo: tag(block, "IssueNo"),
    titleThai: tag(block, "TitleThai"),
    titleEnglish: tag(block, "TitleEnglish"),
    headlineThai: tag(block, "HeadlineThai"),
    headlineEnglish: tag(block, "HeadlineEnglish"),
    descriptionThai: tag(block, "DescriptionThai"),
    descriptionEnglish: tag(block, "DescriptionEnglish"),
    announceDate: tag(block, "AnnounceDate"),
    effectStart: tag(block, "EffectStartDate"),
    effectEnd: tag(block, "EffectEndDate"),
    webUrlThai: tag(block, "WebUrlThai"),
    webUrlEnglish: tag(block, "WebUrlEnglish"),
  }))
}

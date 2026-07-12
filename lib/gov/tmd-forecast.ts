/**
 * TMD daily nationwide forecast (data.tmd.go.th DailyForecast/v2) — one
 * overall summary plus a description per region, both in Thai and English.
 * Shown as its own section on the Government Data Center page.
 */

import { SITE_CONFIG } from "@/lib/config"
import { blocks, tag } from "@/lib/gov/tmd-xml"

export interface GovRegionForecast {
  region: { th: string; en: string }
  description: { th: string; en: string }
}

export interface GovDailyForecast {
  /** TMD's own issue line, Thai only, e.g. "ประจำวันที่ 12 กรกฎาคม 2569 17.00 น." */
  issuedText: string
  overall: { th: string; en: string }
  regions: GovRegionForecast[]
}

export async function fetchTMDDailyForecast(): Promise<GovDailyForecast> {
  const { tmdUid, tmdUkey } = SITE_CONFIG.gov
  const response = await fetch(`https://data.tmd.go.th/api/DailyForecast/v2/?uid=${tmdUid}&ukey=${tmdUkey}`, {
    next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
  })
  if (!response.ok) throw new Error(`TMD forecast API error: ${response.status}`)

  const xmlText = await response.text()

  return {
    issuedText: tag(xmlText, "Date"),
    overall: {
      th: tag(xmlText, "OverallDescriptionThai"),
      en: tag(xmlText, "OverallDescriptionEnglish"),
    },
    regions: blocks(xmlText, "RegionForecast").map((block) => ({
      region: { th: tag(block, "RegionNameThai"), en: tag(block, "RegionNameEnglish") },
      description: { th: tag(block, "DescriptionThai"), en: tag(block, "DescriptionEnglish") },
    })),
  }
}

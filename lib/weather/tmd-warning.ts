/**
 * TMD Weather Warning/Advisory fetcher — shared between /api/weather/warning
 * (used by the banner UI) and the AI tool registry (so the AI assistant can
 * also answer questions about active storm/weather advisories, not just
 * routine forecasts from get_weather).
 */

export interface TMDWarningData {
  hasWarning: boolean
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
  const response = await fetch("https://data.tmd.go.th/api/WeatherWarningNews/v2/?uid=demo&ukey=demokey", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`TMD API error: ${response.status}`)
  }

  const xmlText = await response.text()

  const hasWarning = xmlText.includes("<Warning>") || (xmlText.includes("<Warnings>") && !xmlText.includes("<Warnings/>"))

  let titleThai = ""
  let descriptionThai = ""
  let headlineThai = ""
  let titleEnglish = ""
  let descriptionEnglish = ""
  let headlineEnglish = ""
  let webUrlThai = ""
  let webUrlEnglish = ""

  if (hasWarning) {
    const titleThaiMatch = xmlText.match(/<TitleThai>([\s\S]*?)<\/TitleThai>/i)
    const descThaiMatch = xmlText.match(/<DescriptionThai>([\s\S]*?)<\/DescriptionThai>/i)
    const headlineThaiMatch = xmlText.match(/<HeadlineThai>([\s\S]*?)<\/HeadlineThai>/i)

    const titleEnglishMatch = xmlText.match(/<TitleEnglish>([\s\S]*?)<\/TitleEnglish>/i)
    const descEnglishMatch = xmlText.match(/<DescriptionEnglish>([\s\S]*?)<\/DescriptionEnglish>/i)
    const headlineEnglishMatch = xmlText.match(/<HeadlineEnglish>([\s\S]*?)<\/HeadlineEnglish>/i)

    const webUrlThaiMatch = xmlText.match(/<WebUrlThai>([\s\S]*?)<\/WebUrlThai>/i)
    const webUrlEnglishMatch = xmlText.match(/<WebUrlEnglish>([\s\S]*?)<\/WebUrlEnglish>/i)

    titleThai = titleThaiMatch ? titleThaiMatch[1].trim() : ""
    descriptionThai = descThaiMatch ? descThaiMatch[1].trim() : ""
    headlineThai = headlineThaiMatch ? headlineThaiMatch[1].trim() : ""
    titleEnglish = titleEnglishMatch ? titleEnglishMatch[1].trim() : ""
    descriptionEnglish = descEnglishMatch ? descEnglishMatch[1].trim() : ""
    headlineEnglish = headlineEnglishMatch ? headlineEnglishMatch[1].trim() : ""
    webUrlThai = webUrlThaiMatch ? webUrlThaiMatch[1].trim() : ""
    webUrlEnglish = webUrlEnglishMatch ? webUrlEnglishMatch[1].trim() : ""

    const clean = (text: string) => {
      return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    }

    titleThai = clean(titleThai)
    descriptionThai = clean(descriptionThai)
    headlineThai = clean(headlineThai)
    titleEnglish = clean(titleEnglish)
    descriptionEnglish = clean(descriptionEnglish)
    headlineEnglish = clean(headlineEnglish)
    webUrlThai = clean(webUrlThai)
    webUrlEnglish = clean(webUrlEnglish)
  }

  return {
    hasWarning,
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

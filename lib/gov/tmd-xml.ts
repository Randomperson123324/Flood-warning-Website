/** Tiny tag-extraction helpers for TMD's XML feeds — shared by the
 * announcement and daily-forecast fetchers. Regex is fine here: the feeds are
 * flat, machine-generated, and never nest a tag inside itself. */

export function decodeEntities(text: string): string {
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

/** Last occurrence wins — some TMD feeds repeat English fields per block
 * (mirrors the workaround in lib/weather/tmd-warning.ts). */
export function tag(block: string, name: string): string {
  const matches = [...block.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "gi"))]
  return matches.length > 0 ? decodeEntities(matches[matches.length - 1][1]) : ""
}

/** All occurrences of a block-level tag, e.g. every <RegionForecast>…</RegionForecast>. */
export function blocks(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))].map((m) => m[1])
}

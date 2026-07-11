import { GoogleGenAI } from "@google/genai"
import { SITE_CONFIG } from "@/lib/config"

export async function translateFields(fields: Record<string, string>, target: string = "English"): Promise<Record<string, string>> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured")
  }

  const entries = Object.entries(fields).filter(([, v]) => typeof v === "string" && v.trim())
  if (entries.length === 0) {
    return {}
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const results = await Promise.all(
    entries.map(async ([key, text]) => {
      const response = await genai.models.generateContent({
        model: SITE_CONFIG.ai.model,
        contents: text,
        config: {
          systemInstruction:
            `You are a professional translator. Translate the user's text into ${target}. ` +
            "It is an official weather warning/advisory from the Thai Meteorological Department. " +
            "Preserve meaning, place names, numbers, dates and units precisely. " +
            "Reply with ONLY the translated text, no quotes, notes, or explanations.",
        },
      })
      return [key, response.text?.trim() ?? ""] as const
    }),
  )

  return Object.fromEntries(results)
}

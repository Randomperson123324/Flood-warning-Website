import { NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { SITE_CONFIG } from "@/lib/config"

interface TranslateRequest {
  // Map of field name -> Thai text to translate. Keeping it keyed lets the
  // caller translate title/headline/description in one round trip and keep
  // them associated on the way back.
  fields: Record<string, string>
  target?: string
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 503 })
  }

  let body: TranslateRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const entries = Object.entries(body.fields ?? {}).filter(([, v]) => typeof v === "string" && v.trim())
  if (entries.length === 0) {
    return new Response(JSON.stringify({ error: "No text to translate" }), { status: 400 })
  }

  const target = body.target?.trim() || "English"

  try {
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Translate each field in parallel — the texts are short (a weather
    // advisory title/headline/body), so this is fast and keeps fields isolated.
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

    return new Response(JSON.stringify({ translations: Object.fromEntries(results) }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Translate route error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500 },
    )
  }
}

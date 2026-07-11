import { NextRequest, NextResponse } from "next/server"
import { translateFields } from "@/lib/ai/translate"
import { createServerSupabaseClient } from "@/lib/supabase/server"

interface TranslateRequest {
  fields: Record<string, string>
  target?: string
  issueNo?: string
}

export async function POST(req: NextRequest) {
  let body: TranslateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const target = body.target?.trim() || "English"

  try {
    if (body.issueNo) {
      const supabase = createServerSupabaseClient()
      if (supabase) {
        // Check DB first
        const { data: dbRecord } = await supabase
          .from("tmd_warnings")
          .select("tmd_warnings_content")
          .eq("issue_no", body.issueNo)
          .single()

        if (dbRecord && dbRecord.tmd_warnings_content) {
          return NextResponse.json({ translations: dbRecord.tmd_warnings_content, cached: true })
        }
      }
    }

    // If not in DB, translate using AI
    const translations = await translateFields(body.fields ?? {}, target)

    // Save to DB
    if (body.issueNo) {
      const supabase = createServerSupabaseClient()
      if (supabase) {
        await supabase.from("tmd_warnings").insert({
          issue_no: body.issueNo,
          tmd_warnings_content: translations,
        })
      }
    }

    return NextResponse.json({ translations, cached: false })
  } catch (error) {
    console.error("Translate route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed" },
      { status: error instanceof Error && error.message.includes("GEMINI_API_KEY") ? 503 : 500 },
    )
  }
}

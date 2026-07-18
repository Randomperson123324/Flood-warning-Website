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

  const target = (body.target?.trim() || "English").slice(0, 40)

  // Bound the workload — every field becomes a Gemini call, so an unchecked
  // payload is a direct cost/abuse vector.
  const rawFields = body.fields ?? {}
  const entries = Object.entries(rawFields).slice(0, 12)
  if (entries.some(([, v]) => typeof v !== "string" || v.length > 8000)) {
    return NextResponse.json({ error: "Field too large" }, { status: 400 })
  }
  const fields = Object.fromEntries(entries)
  const issueNo = typeof body.issueNo === "string" ? body.issueNo.slice(0, 64) : undefined

  try {
    const supabase = createServerSupabaseClient()

    if (issueNo && supabase) {
      // Check DB first. maybeSingle() (not single()) — single() errors when
      // duplicates exist, which previously caused a re-translate + re-insert
      // loop that made the duplication worse every time.
      const { data: dbRecord } = await supabase
        .from("tmd_warnings")
        .select("tmd_warnings_content")
        .eq("issue_no", issueNo)
        .limit(1)
        .maybeSingle()

      if (dbRecord?.tmd_warnings_content) {
        return NextResponse.json({ translations: dbRecord.tmd_warnings_content, cached: true })
      }
    }

    // If not in DB, translate using AI
    const translations = await translateFields(fields, target)

    // Save to DB — upsert on issue_no so concurrent requests for the same
    // warning can't create duplicate rows.
    if (issueNo && supabase) {
      await supabase.from("tmd_warnings").upsert(
        { issue_no: issueNo, tmd_warnings_content: translations },
        { onConflict: "issue_no" },
      )
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

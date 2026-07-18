import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { verifyTurnstileToken } from "@/lib/turnstile"

const VALID_SEVERITIES = ["low", "moderate", "high", "critical"]

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const { area_name, severity, description, turnstileToken } = body

  if (!area_name || typeof area_name !== "string" || area_name.trim().length === 0) {
    return NextResponse.json({ error: "area_name is required" }, { status: 400 })
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 })
  }
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "description is required" }, { status: 400 })
  }
  // Sanity caps — keep abuse from stuffing megabytes into public rows.
  if (area_name.length > 120 || description.length > 2000) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 })
  }

  const verification = await verifyTurnstileToken(turnstileToken)
  if (!verification.ok) {
    return NextResponse.json({ error: "Bot verification failed", reason: verification.reason }, { status: 403 })
  }

  const supabase = createServerSupabaseClient(token)
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data, error } = await supabase
    .from("flood_reports")
    .insert({
      user_id: user.id,
      area_name: area_name.trim(),
      severity,
      description: description.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data)
}

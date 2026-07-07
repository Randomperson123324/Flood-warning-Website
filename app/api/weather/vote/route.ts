import { createServerSupabaseClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { SITE_CONFIG } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const thirtyMinutesAgo = new Date(Date.now() - SITE_CONFIG.community.weatherVoteWindowMs).toISOString()

    const { data, error } = await supabase
      .from("weather_votes")
      .select("is_raining")
      .gte("created_at", thirtyMinutesAgo)

    if (error) {
      console.error("Error fetching votes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalVotes = data.length
    const validVotes = data.filter((vote) => vote.is_raining !== null)
    const totalValidVotes = validVotes.length
    const rainVotes = validVotes.filter((vote) => vote.is_raining === true).length
    const rainPercentage = totalValidVotes > 0 ? Math.round((rainVotes / totalValidVotes) * 100) : 0

    return NextResponse.json({
      totalVotes,
      totalValidVotes,
      rainVotes,
      rainPercentage,
      isRaining: rainPercentage > 50,
    })
  } catch (error) {
    console.error("Internal error fetching votes:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Internal Server Error: " + message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { is_raining, location, visitor_id } = body

    if (is_raining !== null && typeof is_raining !== "boolean") {
      return NextResponse.json({ error: "Invalid input: is_raining must be a boolean or null" }, { status: 400 })
    }

    const authHeader = request.headers.get("Authorization")
    let user_id = null
    let supabase = createServerSupabaseClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      supabase = createServerSupabaseClient(token) ?? supabase

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token)

      if (!authError && user) {
        user_id = user.id
      }
    }

    if (!user_id && !visitor_id) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication or visitor ID" }, { status: 401 })
    }

    const thirtyMinutesAgo = new Date(Date.now() - SITE_CONFIG.community.weatherVoteWindowMs).toISOString()

    let query = supabase.from("weather_votes").select("id").gte("created_at", thirtyMinutesAgo)

    if (user_id) {
      query = query.eq("user_id", user_id)
    } else {
      query = query.eq("visitor_id", visitor_id)
    }

    const { data: existingVotes, error: checkError } = await query

    if (checkError) {
      console.error("Error checking existing votes:", checkError)
      return NextResponse.json({ error: "Database error: " + checkError.message }, { status: 500 })
    }

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json({ error: "You have already voted recently" }, { status: 429 })
    }

    const { error: insertError } = await supabase.from("weather_votes").insert({
      user_id,
      visitor_id: user_id ? null : visitor_id,
      is_raining,
      location: location || "Unknown",
    })

    if (insertError) {
      console.error("Error inserting vote:", insertError)
      return NextResponse.json({ error: "Database insert error: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Internal error submitting vote:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Internal Server Error: " + message }, { status: 500 })
  }
}

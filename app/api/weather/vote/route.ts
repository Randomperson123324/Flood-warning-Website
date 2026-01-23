import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Helper function to create authenticated or anonymous client
const createSupabaseClient = (token?: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    const options = token
        ? {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
        : {}

    return createClient(supabaseUrl, supabaseAnonKey, options)
}

export async function GET(request: NextRequest) {
    try {
        const supabase = createSupabaseClient()

        // Get votes from the last 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

        const { data, error } = await supabase
            .from("weather_votes")
            .select("is_raining")
            .gte("created_at", thirtyMinutesAgo)

        if (error) {
            console.error("Error fetching votes:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const totalVotes = data.length

        // Filter out null (unsure) votes for percentage calculation
        const validVotes = data.filter((vote) => vote.is_raining !== null)
        const totalValidVotes = validVotes.length
        const rainVotes = validVotes.filter((vote) => vote.is_raining === true).length

        // Calculate percentage based on decided votes only
        const rainPercentage = totalValidVotes > 0 ? Math.round((rainVotes / totalValidVotes) * 100) : 0

        return NextResponse.json({
            totalVotes, // Keep total engagement count
            totalValidVotes, // Count of votes that are not "unsure"
            rainVotes,
            rainPercentage,
            isRaining: rainPercentage > 50, // Simple majority rule of valid votes
        })
    } catch (error) {
        console.error("Internal error fetching votes:", error)
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: "Internal Server Error: " + message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization")
        if (!authHeader) {
            return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
        }

        const token = authHeader.replace("Bearer ", "")

        // Create authenticated client
        const supabase = createSupabaseClient(token)

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error("Auth verification failed:", authError)
            return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
        }

        const body = await request.json()
        const { is_raining, location } = body

        // Allow boolean or null (for unsure)
        if (is_raining !== null && typeof is_raining !== "boolean") {
            return NextResponse.json({ error: "Invalid input: is_raining must be a boolean or null" }, { status: 400 })
        }

        // Check if user has voted in the last 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const { data: existingVotes, error: checkError } = await supabase
            .from("weather_votes")
            .select("id")
            .eq("user_id", user.id)
            .gte("created_at", thirtyMinutesAgo)

        if (checkError) {
            console.error("Error checking existing votes:", checkError)
            return NextResponse.json({ error: "Database error: " + checkError.message }, { status: 500 })
        }

        if (existingVotes && existingVotes.length > 0) {
            return NextResponse.json({ error: "You have already voted recently" }, { status: 429 })
        }

        // Insert new vote
        const { error: insertError } = await supabase.from("weather_votes").insert({
            user_id: user.id,
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

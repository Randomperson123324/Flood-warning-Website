import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
    try {
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
        const rainVotes = data.filter((vote) => vote.is_raining).length
        const rainPercentage = totalVotes > 0 ? Math.round((rainVotes / totalVotes) * 100) : 0

        return NextResponse.json({
            totalVotes,
            rainVotes,
            rainPercentage,
            isRaining: rainPercentage > 50, // Simple majority rule
        })
    } catch (error) {
        console.error("Internal error fetching votes:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization")
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.replace("Bearer ", "")
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { is_raining, location } = body

        if (typeof is_raining !== "boolean") {
            return NextResponse.json({ error: "Invalid input: is_raining must be a boolean" }, { status: 400 })
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
            return NextResponse.json({ error: "Database error" }, { status: 500 })
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
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Internal error submitting vote:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const response = await fetch("https://data.tmd.go.th/api/WeatherWarningNews/v2/?uid=demo&ukey=demokey", {
            cache: "no-store",
        })

        if (!response.ok) {
            throw new Error(`TMD API error: ${response.status}`)
        }

        const xmlText = await response.text()

        // Basic XML parsing using regex (avoiding external dependencies for now)
        const hasWarning = xmlText.includes("<Warning>") || (xmlText.includes("<Warnings>") && !xmlText.includes("<Warnings/>"))

        let warningTitle = ""
        let warningDescription = ""

        if (hasWarning) {
            // Try to extract title and description if present
            // Match nested tags inside <Warning> if they exist
            const titleMatch = xmlText.match(/<Title>([\s\S]*?)<\/Title>/i)
            const descMatch = xmlText.match(/<Description>([\s\S]*?)<\/Description>/i)

            warningTitle = titleMatch ? titleMatch[1].trim() : "Weather Warning"
            warningDescription = descMatch ? descMatch[1].trim() : "Active weather warning from TMD."

            // Clean up XML entities if any (basic ones)
            warningTitle = warningTitle.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            warningDescription = warningDescription.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        }

        return NextResponse.json({
            hasWarning,
            title: warningTitle,
            description: warningDescription,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error("Error fetching TMD warning:", error)
        return NextResponse.json(
            { error: "Failed to fetch weather warnings" },
            { status: 500 }
        )
    }
}

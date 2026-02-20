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

        let titleThai = ""
        let descriptionThai = ""
        let titleEnglish = ""
        let descriptionEnglish = ""

        if (hasWarning) {
            // Try to extract Thai fields
            const titleThaiMatch = xmlText.match(/<TitleThai>([\s\S]*?)<\/TitleThai>/i)
            const descThaiMatch = xmlText.match(/<DescriptionThai>([\s\S]*?)<\/DescriptionThai>/i)

            // Try to extract English fields
            const titleEnglishMatch = xmlText.match(/<TitleEnglish>([\s\S]*?)<\/TitleEnglish>/i)
            const descEnglishMatch = xmlText.match(/<DescriptionEnglish>([\s\S]*?)<\/DescriptionEnglish>/i)

            titleThai = titleThaiMatch ? titleThaiMatch[1].trim() : ""
            descriptionThai = descThaiMatch ? descThaiMatch[1].trim() : ""
            titleEnglish = titleEnglishMatch ? titleEnglishMatch[1].trim() : ""
            descriptionEnglish = descEnglishMatch ? descEnglishMatch[1].trim() : ""

            // Clean up XML entities
            const clean = (text: string) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

            titleThai = clean(titleThai)
            descriptionThai = clean(descriptionThai)
            titleEnglish = clean(titleEnglish)
            descriptionEnglish = clean(descriptionEnglish)
        }

        return NextResponse.json({
            hasWarning,
            titleThai,
            descriptionThai,
            titleEnglish,
            descriptionEnglish,
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

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
        let headlineThai = ""
        let titleEnglish = ""
        let descriptionEnglish = ""
        let headlineEnglish = ""

        if (hasWarning) {
            // Try to extract Thai fields
            const titleThaiMatch = xmlText.match(/<TitleThai>([\s\S]*?)<\/TitleThai>/i)
            const descThaiMatch = xmlText.match(/<DescriptionThai>([\s\S]*?)<\/DescriptionThai>/i)
            const headlineThaiMatch = xmlText.match(/<HeadlineThai>([\s\S]*?)<\/HeadlineThai>/i)

            // Try to extract English fields
            const titleEnglishMatch = xmlText.match(/<TitleEnglish>([\s\S]*?)<\/TitleEnglish>/i)
            const descEnglishMatch = xmlText.match(/<DescriptionEnglish>([\s\S]*?)<\/DescriptionEnglish>/i)
            const headlineEnglishMatch = xmlText.match(/<HeadlineEnglish>([\s\S]*?)<\/HeadlineEnglish>/i)

            titleThai = titleThaiMatch ? titleThaiMatch[1].trim() : ""
            descriptionThai = descThaiMatch ? descThaiMatch[1].trim() : ""
            headlineThai = headlineThaiMatch ? headlineThaiMatch[1].trim() : ""
            titleEnglish = titleEnglishMatch ? titleEnglishMatch[1].trim() : ""
            descriptionEnglish = descEnglishMatch ? descEnglishMatch[1].trim() : ""
            headlineEnglish = headlineEnglishMatch ? headlineEnglishMatch[1].trim() : ""

            // Clean up XML entities
            const clean = (text: string) => {
                return text
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
            }

            titleThai = clean(titleThai)
            descriptionThai = clean(descriptionThai)
            headlineThai = clean(headlineThai)
            titleEnglish = clean(titleEnglish)
            descriptionEnglish = clean(descriptionEnglish)
            headlineEnglish = clean(headlineEnglish)
        }

        return NextResponse.json({
            hasWarning,
            titleThai,
            descriptionThai,
            headlineThai,
            titleEnglish,
            descriptionEnglish,
            headlineEnglish,
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

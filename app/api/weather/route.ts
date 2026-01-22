import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY

    // Enhanced debugging for API key issues
    console.log("=== Server: Weather API Debug Info ===")
    console.log("Server: API Key exists:", !!apiKey)
    console.log("Server: API Key length:", apiKey?.length || 0)

    if (!apiKey) {
      console.error("❌ Server: OpenWeather API key not found in environment variables")
      console.error(
        "Server: Available env vars (filtered for 'WEATHER'):",
        Object.keys(process.env).filter((key) => key.includes("WEATHER")),
      )
      return NextResponse.json(
        {
          error: "Weather service not configured",
          details: "OPENWEATHER_API_KEY environment variable is missing.",
          setup:
            "Get your API key from https://openweathermap.org/api and add it to .env.local (local) or Vercel Environment Variables (deployment).",
        },
        { status: 503 },
      )
    }

    if (apiKey.length < 10) {
      console.error("❌ Server: OpenWeather API key appears to be invalid (too short):", apiKey.substring(0, 8) + "...")
      return NextResponse.json(
        {
          error: "Weather service misconfigured",
          details: "Invalid API key format - key too short.",
          setup: "Verify your API key from https://openweathermap.org/api.",
        },
        { status: 503 },
      )
    }

    console.log(
      "✅ Server: Using OpenWeather API key:",
      apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4),
    )

    // Get coordinates from environment variables or use defaults
    const lat = Number.parseFloat(process.env.LATITUDE || "13.7563") // Bangkok as default
    const lon = Number.parseFloat(process.env.LONGITUDE || "100.5018")
    const cityName = process.env.CITY_NAME || "Bangkok" // Default city name

    // Validate parsed coordinates
    if (isNaN(lat) || isNaN(lon)) {
      console.error("❌ Server: Invalid LATITUDE or LONGITUDE environment variable. Must be numbers.")
      return NextResponse.json(
        {
          error: "Location configuration error",
          details: "LATITUDE or LONGITUDE environment variables are not valid numbers.",
          suggestion: "Ensure LATITUDE and LONGITUDE in .env.local (or Vercel) are numeric values.",
        },
        { status: 500 },
      )
    }

    console.log(`🌍 Server: Fetching weather for: ${cityName} (${lat}, ${lon})`)

    // Add timeout and error handling for external API calls
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      // Test API key with current weather call
      console.log("🔄 Server: Testing OpenWeather API connection...")

      const testUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      console.log("📡 Server: API URL (masked):", testUrl.replace(apiKey, "***API_KEY***"))

      const currentResponse = await fetch(testUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "FloodMonitoringSystem/1.0",
        },
        cache: "no-store", // IMPORTANT: Bypass Next.js Data Cache for this external API call
      })

      clearTimeout(timeoutId)

      console.log("📊 Server: OpenWeather API response status:", currentResponse.status)

      if (!currentResponse.ok) {
        const errorText = await currentResponse.text()
        console.error("❌ Server: OpenWeather API error response:", errorText)

        if (currentResponse.status === 401) {
          return NextResponse.json(
            {
              error: "Weather service authentication failed",
              details: "Invalid API key or API key not activated.",
              suggestion:
                "Check your OpenWeather API key and ensure it's activated (can take up to 2 hours after signup).",
              setup:
                "1. Sign up at https://openweathermap.org/api\n2. Get your API key\n3. Add OPENWEATHER_API_KEY to .env.local\n4. Wait up to 2 hours for activation",
            },
            { status: 503 },
          )
        }

        if (currentResponse.status === 429) {
          return NextResponse.json(
            {
              error: "Weather service rate limit exceeded",
              details: "Too many requests to weather API.",
              suggestion: "Wait a few minutes before trying again.",
            },
            { status: 503 },
          )
        }

        throw new Error(`Weather API error: ${currentResponse.status} ${currentResponse.statusText}`)
      }

      const currentData = await currentResponse.json()
      console.log("✅ Server: Successfully fetched current weather data for:", currentData.name)
      console.log("🌡️ Server: Current temperature:", currentData.main.temp + "°C")
      console.log("🌤️ Server: Weather condition:", currentData.weather[0].description)

      // Log precipitation data if available
      if (currentData.rain) {
        console.log("🌧️ Server: Rain data:", currentData.rain)
      }
      if (currentData.snow) {
        console.log("❄️ Server: Snow data:", currentData.snow)
      }

      // Fetch 5-day forecast
      const forecastController = new AbortController()
      const forecastTimeoutId = setTimeout(() => forecastController.abort(), 15000)

      console.log("🔄 Server: Fetching 5-day forecast...")

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
        {
          signal: forecastController.signal,
          headers: {
            "User-Agent": "FloodMonitoringSystem/1.0",
          },
          cache: "no-store", // IMPORTANT: Bypass Next.js Data Cache for this external API call
        },
      )

      clearTimeout(forecastTimeoutId)

      let dailyForecast = []

      if (!forecastResponse.ok) {
        console.error("⚠️ Server: Forecast API error:", forecastResponse.status)
        console.log("📊 Server: Returning current weather only (forecast failed)")
      } else {
        const forecastData = await forecastResponse.json()
        console.log("✅ Server: Successfully fetched forecast data")

        // Process forecast data (get one reading per day)
        dailyForecast = forecastData.list
          .filter((_: any, index: number) => index % 8 === 0) // Every 8th item (24 hours)
          .slice(0, 5)
          .map((item: any) => ({
            date: item.dt_txt,
            temp: Math.round(item.main.temp),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            precipitation: item.rain?.["3h"] || 0,
          }))

        console.log("📅 Server: Processed forecast for", dailyForecast.length, "days")
      }

      const weatherData = {
        city: currentData.name || cityName, // Use API city name or fallback
        country: currentData.sys?.country || "",
        coordinates: { lat, lon },
        current: {
          temp: Math.round(currentData.main.temp),
          humidity: currentData.main.humidity,
          windSpeed: Math.round(currentData.wind.speed * 10) / 10,
          description: currentData.weather[0].description,
          icon: currentData.weather[0].icon,
          rain: currentData.rain || undefined, // Include rain data
          snow: currentData.snow || undefined, // Include snow data
        },
        forecast: dailyForecast,
        timestamp: new Date().toISOString(),
        source: "OpenWeather API (Live Data)",
      }

      console.log("🎉 Server: Successfully prepared weather data response")
      console.log("📍 Server: Final city:", weatherData.city)

      // Add cache headers (shorter cache for testing)
      // For production, you might want a longer cache like s-maxage=1800 (30 mins)
      return NextResponse.json(weatherData, {
        headers: {
          "Cache-Control": "public, s-maxage=0, must-revalidate", // No cache for debugging
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError
    }
  } catch (error) {
    console.error("💥 Server: Uncaught error in weather API route:", error)

    // Ensure a JSON response is always returned for any unhandled error
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "An unexpected error occurred on the server.",
        suggestion: "Check server logs for more details.",
      },
      { status: 500 },
    )
  }
}

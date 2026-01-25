import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiToken = process.env.TMD_API_TOKEN

    // Enhanced debugging for API token issues
    console.log("=== Server: Weather API Debug Info ===")
    console.log("Server: API Token exists:", !!apiToken)
    console.log("Server: API Token length:", apiToken?.length || 0)

    if (!apiToken) {
      console.error("❌ Server: TMD API token not found in environment variables")
      console.error(
        "Server: Available env vars (filtered for 'TMD'):",
        Object.keys(process.env).filter((key) => key.includes("TMD")),
      )
      return NextResponse.json(
        {
          error: "Weather service not configured",
          details: "TMD_API_TOKEN environment variable is missing.",
          setup:
            "Register at https://data.tmd.go.th/nwpapi/register, create an OAuth Access Token, and add it to .env.local (local) or Vercel Environment Variables (deployment).",
        },
        { status: 503 },
      )
    }

    if (apiToken.length < 10) {
      console.error("❌ Server: TMD API token appears to be invalid (too short):", apiToken.substring(0, 8) + "...")
      return NextResponse.json(
        {
          error: "Weather service misconfigured",
          details: "Invalid API token format - token too short.",
          setup: "Verify your OAuth Access Token from https://data.tmd.go.th/nwpapi/login.",
        },
        { status: 503 },
      )
    }

    console.log(
      "✅ Server: Using TMD API token:",
      apiToken.substring(0, 8) + "..." + apiToken.substring(apiToken.length - 4),
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
      // Get current date and time for TMD API
      const now = new Date()
      const dateStr = now.toISOString().split("T")[0] // YYYY-MM-DD format
      const currentHour = now.getHours()

      // Fetch hourly forecast for current conditions (next 24 hours, hourly)
      console.log("🔄 Server: Fetching hourly forecast from TMD API...")

      // Request fields: tc (temp), rh (humidity), cond (condition code)
      const hourlyUrl = `https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat=${lat}&lon=${lon}&fields=tc,rh,cond&date=${dateStr}&hour=${currentHour}&duration=24`
      console.log("📡 Server: Hourly API URL (masked):", hourlyUrl.replace(apiToken, "***TOKEN***"))

      const hourlyResponse = await fetch(hourlyUrl, {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiToken}`,
        },
        cache: "no-store", // IMPORTANT: Bypass Next.js Data Cache for this external API call
      })

      clearTimeout(timeoutId)

      console.log("📊 Server: TMD API hourly response status:", hourlyResponse.status)

      if (!hourlyResponse.ok) {
        const errorText = await hourlyResponse.text()
        console.error("❌ Server: TMD API error response:", errorText)

        if (hourlyResponse.status === 401) {
          return NextResponse.json(
            {
              error: "Weather service authentication failed",
              details: "Invalid API token or token not activated.",
              suggestion:
                "Check your TMD API token and ensure it's valid. You may need to regenerate it at https://data.tmd.go.th/nwpapi/login",
              setup:
                "1. Log in at https://data.tmd.go.th/nwpapi/login\n2. Create a new OAuth Access Token\n3. Add TMD_API_TOKEN to .env.local\n4. The token is only shown once, so save it immediately",
            },
            { status: 503 },
          )
        }

        if (hourlyResponse.status === 429) {
          return NextResponse.json(
            {
              error: "Weather service rate limit exceeded",
              details: "Too many requests to TMD API.",
              suggestion: "Wait a few minutes before trying again.",
            },
            { status: 503 },
          )
        }

        throw new Error(`TMD API error: ${hourlyResponse.status} ${hourlyResponse.statusText}`)
      }

      const hourlyData = await hourlyResponse.json()
      console.log("✅ Server: Successfully fetched hourly forecast data")
      console.log("📦 Server: Hourly response structure:", JSON.stringify(hourlyData, null, 2))

      // Extract current weather from first hourly forecast
      const forecasts = hourlyData.WeatherForecasts?.[0]?.forecasts || []

      if (forecasts.length === 0) {
        throw new Error("No forecast data available from TMD API")
      }

      const currentForecast = forecasts[0]
      const currentData = currentForecast.data

      console.log("🌡️ Server: Current temperature:", currentData.tc + "°C")
      console.log("💧 Server: Current humidity:", currentData.rh + "%")
      console.log("💨 Server: Current wind speed:", currentData.ws + " m/s")

      // Log precipitation data if available
      if (currentData.rain !== undefined && currentData.rain !== null) {
        console.log("🌧️ Server: Rain data:", currentData.rain, "mm")
      }


      // Map TMD condition codes to English descriptions (official TMD codes)
      const getWeatherDescription = (cond: number | undefined): string => {
        if (!cond) return "Partly Cloudy"

        const conditionMap: { [key: number]: string } = {
          1: "Clear",
          2: "Partly Cloudy",
          3: "Cloudy",
          4: "Overcast",
          5: "Light Rain",
          6: "Moderate Rain",
          7: "Heavy Rain",
          8: "Thunderstorm",
          9: "Very Cold",
          10: "Cold",
          11: "Cool",
          12: "Very Hot",
        }

        return conditionMap[cond] || "Partly Cloudy"
      }

      // Map TMD condition to weather icon codes
      const getWeatherIcon = (cond: number | undefined): string => {
        if (!cond) return "02d" // Partly cloudy default

        if (cond === 1) return "01d" // Clear
        if (cond === 2) return "02d" // Partly cloudy
        if (cond === 3) return "03d" // Cloudy
        if (cond === 4) return "04d" // Overcast
        if (cond === 5) return "09d" // Light rain
        if (cond === 6) return "10d" // Moderate rain
        if (cond === 7) return "10d" // Heavy rain
        if (cond === 8) return "11d" // Thunderstorm
        if (cond >= 9 && cond <= 11) return "01d" // Cold weather (clear icon)
        if (cond === 12) return "01d" // Very hot (clear icon)

        return "02d" // Default
      }


      // Fetch daily forecast (next 5 days)
      const dailyController = new AbortController()
      const dailyTimeoutId = setTimeout(() => dailyController.abort(), 15000)

      console.log("🔄 Server: Fetching daily forecast from TMD API...")

      const dailyUrl = `https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at?lat=${lat}&lon=${lon}&fields=tc_max,tc_min,rh,cond&date=${dateStr}&duration=5`
      console.log("📡 Server: Daily API URL (masked):", dailyUrl.replace(apiToken, "***TOKEN***"))

      const dailyResponse = await fetch(dailyUrl, {
        signal: dailyController.signal,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiToken}`,
        },
        cache: "no-store",
      })

      clearTimeout(dailyTimeoutId)

      let dailyForecast = []

      if (!dailyResponse.ok) {
        console.error("⚠️ Server: Daily forecast API error:", dailyResponse.status)
        console.log("📊 Server: Returning current weather only (daily forecast failed)")
      } else {
        const dailyData = await dailyResponse.json()
        console.log("✅ Server: Successfully fetched daily forecast data")
        console.log("📦 Server: Daily response structure:", JSON.stringify(dailyData, null, 2))

        const dailyForecasts = dailyData.WeatherForecasts?.[0]?.forecasts || []

        dailyForecast = dailyForecasts.map((item: any) => ({
          date: item.time,
          temp: Math.round((item.data.tc_max + item.data.tc_min) / 2), // Average of max and min
          description: getWeatherDescription(item.data.cond),
          icon: getWeatherIcon(item.data.cond),
          precipitation: 0, // Rain volume not available in basic field set
        }))

        console.log("📅 Server: Processed forecast for", dailyForecast.length, "days")
      }

      const weatherData = {
        city: cityName,
        country: "TH", // Thailand
        coordinates: { lat, lon },
        current: {
          temp: Math.round(currentData.tc),
          humidity: Math.round(currentData.rh),
          windSpeed: 0, // Wind speed not available in basic field set
          description: getWeatherDescription(currentData.cond),
          icon: getWeatherIcon(currentData.cond),
          rain: undefined, // Rain volume not available in basic field set
        },
        forecast: dailyForecast,
        timestamp: new Date().toISOString(),
        source: "Thai Meteorological Department (TMD)",
      }

      console.log("🎉 Server: Successfully prepared weather data response")
      console.log("📍 Server: Final city:", weatherData.city)
      console.log("🌧️ Server: Rain data included:", !!weatherData.current.rain)

      // Add cache headers (shorter cache for testing)
      // For production, you might want a longer cache like s-maxage=1800 (30 mins)
      return NextResponse.json(weatherData, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300", // 10 min cache
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

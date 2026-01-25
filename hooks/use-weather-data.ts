"use client"

import { useState, useEffect } from "react"

interface WeatherData {
  city: string
  country: string
  coordinates: { lat: number; lon: number }
  current: {
    temp: number
    humidity: number
    windSpeed: number
    descriptionTh?: string // Thai description
    icon: string
    rain?: {
      "1h"?: number // Rain volume for last 1 hour in mm
      "3h"?: number // Rain volume for last 3 hours in mm
    }
    snow?: {
      "1h"?: number // Snow volume for last 1 hour in mm
      "3h"?: number // Snow volume for last 3 hours in mm
    }
  }
  forecast: Array<{
    date: string
    tempMax: number
    tempMin: number
    description: string
    descriptionTh?: string // Thai description
    icon: string
    precipitation: number
  }>
  hourly: Array<{
    time: string
    temp: number
    description: string
    descriptionTh?: string // Thai description
    icon: string
    precipitation: number
    humidity: number
    windSpeed: number
  }>
  source: string // Added to indicate data source (e.g., "Live Data")
  timestamp: string // Added to indicate when data was fetched
}

export function useWeatherData() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeatherData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Client: Initiating fetch for weather data from /api/weather...")

      const response = await fetch("/api/weather", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Force fresh data, bypass Next.js cache
      })

      console.log("Client: Received response status:", response.status)

      // Read the response body as text first, regardless of status
      const responseBodyText = await response.text()
      console.log("Client: Raw response body received:", responseBodyText.substring(0, 200) + "...") // Log a snippet

      if (!response.ok) {
        let errorDetails = "Unknown error"
        try {
          // Attempt to parse the already-read text as JSON
          const errorData = JSON.parse(responseBodyText)
          errorDetails = errorData.details || errorData.error || "Server returned an error."
          console.error("Client: Weather API route returned JSON error:", errorData)
        } catch (jsonParseError) {
          // If JSON parsing fails, use the raw text as the error message
          console.error("Client: Weather API route returned non-JSON or unparseable error:", responseBodyText)
          errorDetails = `Server Error (${response.status}): ${responseBodyText.substring(0, 100)}...` // Truncate for display
        }

        setError(errorDetails)
        setWeatherData(null)
        return
      }

      // If response is OK, parse the already-read text as JSON
      const data = JSON.parse(responseBodyText)
      console.log("Client: Weather data successfully received:", data)

      // Validate that we have real weather data structure
      if (!data.current || !data.city || !data.source || !data.timestamp) {
        console.error("Client: Invalid weather data structure received:", data)
        setError("Invalid weather data received from server. Data structure is incomplete.")
        setWeatherData(null)
        return
      }

      setWeatherData(data)
      setError(null) // Clear any previous errors
    } catch (err) {
      console.error("Client: Error fetching weather data:", err)
      setError("Failed to connect to weather service. Check network or server logs.")
      setWeatherData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch immediately on mount
    fetchWeatherData()

    // Update weather data every 30 minutes (1800000 ms)
    const interval = setInterval(fetchWeatherData, 1800000)

    return () => clearInterval(interval)
  }, [])

  return {
    weatherData,
    isLoading,
    error,
    refetch: fetchWeatherData, // Allow manual refetch
  }
}

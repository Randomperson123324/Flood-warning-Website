"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "../hooks/language-context"

interface WeatherMapProps {
  coordinates?: { lat: number; lon: number }
  city?: string
}

export function WeatherMap({ coordinates, city }: WeatherMapProps) {
  const { t } = useLanguage()
  const [showMap, setShowMap] = useState(false)

  if (!coordinates) {
    return null
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.weather.weatherMap}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
            {showMap ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                {t.weather.hideMap}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                {t.weather.showMap}
              </>
            )}
          </Button>
        </CardTitle>
        {city && (
          <CardDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {city}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {coordinates.lat.toFixed(2)}, {coordinates.lon.toFixed(2)}
            </span>
          </CardDescription>
        )}
      </CardHeader>

      {showMap && (
        <CardContent>
          <div className="relative w-full h-[400px] rounded-tr-lg rounded-bl-2xl overflow-hidden border">
            <iframe src="https://www.tmd.go.th/StromTrack" height="600" scrolling="no" frameborder="0"></iframe>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            แผนที่พายุจาก กรมอุตุนิยมวิทยา
          </p>
        </CardContent>
      )}
    </Card>
  )
}

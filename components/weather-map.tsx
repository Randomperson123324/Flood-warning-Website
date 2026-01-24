"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "../hooks/language-context"

interface WeatherMapProps {
  city?: string
}

export function WeatherMap({ city }: WeatherMapProps) {
  const { t } = useLanguage()
  const [showMap, setShowMap] = useState(false)

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
          <CardDescription>
            <Badge variant="outline" className="text-xs">
              {city}
            </Badge>
          </CardDescription>
        )}
      </CardHeader>

      {showMap && (
        <CardContent>
          <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
            <iframe
              src="https://www.tmd.go.th/StromTrack"
              width="100%"
              height="100%"
              scrolling="no"
              frameBorder="0"
              loading="lazy"
              title="TMD Storm Tracking"
            />
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Thailand Meteorological Department(กรมอุตุนิยมวิทยา) – Storm Tracking
          </p>
        </CardContent>
      )}
    </Card>
  )
}

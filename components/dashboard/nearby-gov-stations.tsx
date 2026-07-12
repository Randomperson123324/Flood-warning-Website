"use client"

import { CloudRain, LocateFixed, MapPin } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import type { GeolocationStatus } from "@/hooks/use-geolocation"
import { useNearbyGovStations } from "@/hooks/use-nearby-gov-stations"
import { RAIN_HEAVY_MM, RAIN_VERY_HEAVY_MM } from "@/lib/gov/thaiwater"
import type { UserLocation } from "@/types"

interface NearbyGovStationsProps {
  location: UserLocation | null
  status: GeolocationStatus
  onRetry: () => void
}

/** Nearest HII (ThaiWater) rain stations — rendered at the bottom of the
 * dashboard. Only a real GPS fix gets station data: an IP-derived position is
 * too coarse for "near you" to mean anything, so everyone else sees a prompt
 * to grant GPS access instead. */
export function NearbyGovStations({ location, status, onRetry }: NearbyGovStationsProps) {
  const { t, locale } = useLanguage()
  const { stations, loading, error } = useNearbyGovStations(location)

  const hasGps = location?.source === "gps"

  return (
    <section className="glass-panel animate-fade-in-up p-5">
      <div className="mb-1 flex items-center gap-2">
        <CloudRain className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold">{t("gov", "nearbyTitle")}</h2>
      </div>
      <p className="mb-4 text-xs text-ink-soft">{t("gov", "warningsSource")}</p>

      {!hasGps ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-center text-sm text-ink-soft">{t("gov", "nearbyNeedsGps")}</p>
          {status !== "resolving" && (
            <button
              type="button"
              onClick={onRetry}
              className="glass-panel-strong glass-interactive flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent"
            >
              <LocateFixed className="h-4 w-4" />
              {t("gov", "nearbyEnableGps")}
            </button>
          )}
        </div>
      ) : loading && stations.length === 0 ? (
        <div className="h-24 animate-pulse rounded-glass-sm bg-surface/40" />
      ) : error ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t("gov", "sectionError")}</p>
      ) : stations.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t("status", "noData")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stations.map((s, i) => {
            const veryHeavy = s.rain24h > RAIN_VERY_HEAVY_MM
            const heavy = s.rain24h > RAIN_HEAVY_MM
            return (
              <li key={`${s.stationName}-${i}`} className="glass-panel-strong flex items-center gap-3 p-3">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.stationName}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {locale === "th"
                      ? `${s.amphoe.th} · ${s.province.th}${s.agency.th ? ` · ${s.agency.th}` : ""}`
                      : `${s.amphoe.en} · ${s.province.en}${s.agency.en ? ` · ${s.agency.en}` : ""}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      veryHeavy ? "text-status-danger" : heavy ? "text-status-warning" : "text-accent"
                    }`}
                  >
                    {s.rain24h.toFixed(1)} {t("gov", "mm")}
                  </p>
                  <p className="text-[10px] text-ink-soft">
                    {t("gov", "rain24hLabel")} · {s.distanceKm.toFixed(1)} {t("common", "km")}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Droplets } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: any = null
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
} catch (error) {
  console.error("[v0] Failed to initialize Supabase client:", error)
}

interface Area {
  id: string
  name: string
  water_level_threshold: number
  report_count?: number
  latest_severity?: string
  recent_reports?: number
}

export function AffectedAreas() {
  const { t } = useLanguage()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAffectedAreas()

    if (supabase) {
      const subscription = supabase
        .channel("affected_areas_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "flood_reports" }, () => {
          loadAffectedAreas()
        })
        .subscribe()

      return () => subscription.unsubscribe()
    }
  }, [])

  const loadAffectedAreas = async () => {
    if (!supabase) return

    try {
      // Get all affected areas
      const { data: areasData } = await supabase.from("affected_areas").select("*").order("name")

      if (!areasData) return

      // Get report counts for each area
      const { data: reportsData } = await supabase
        .from("flood_reports")
        .select("area_name, severity, created_at")
        .order("created_at", { ascending: false })
        .limit(500)

      // Process data
      const enrichedAreas = areasData.map((area: Area) => {
        const areaReports =
          reportsData?.filter(
            (report: any) =>
              report.area_name === area.name &&
              new Date(report.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000),
          ) || []

        const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 }
        const latestSeverity =
          areaReports.length > 0
            ? areaReports.sort(
                (a: any, b: any) =>
                  (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                  (severityOrder[a.severity as keyof typeof severityOrder] || 0),
              )[0].severity
            : null

        return {
          ...area,
          report_count: areaReports.length,
          latest_severity: latestSeverity,
          recent_reports: areaReports.length,
        }
      })

      setAreas(enrichedAreas)
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading affected areas:", error)
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "moderate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const getAreaStatus = (threshold: number, severity: string | null) => {
    if (!severity) return "safe"
    if (severity === "critical") return "critical"
    if (severity === "high") return "warning"
    return "caution"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">{t.affectedAreas.loading}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          {t.affectedAreas.title}
        </CardTitle>
        <CardDescription>{t.affectedAreas.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t.affectedAreas.noAreas}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => (
              <div
                key={area.id}
                className={`p-4 rounded-tr-2xl rounded-bl-2xl border-2 transition-colors ${
                  area.latest_severity
                    ? {
                        critical: "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700",
                        high: "border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700",
                        moderate: "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700",
                        low: "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700",
                      }[area.latest_severity] || "border-gray-300 bg-gray-50 dark:bg-gray-900/20"
                    : "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{area.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.affectedAreas.threshold} {area.water_level_threshold}cm</p>
                  </div>
                  {area.latest_severity && (
                    <Badge className={getSeverityColor(area.latest_severity)}>{area.latest_severity}</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {area.recent_reports > 0 ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          {area.recent_reports} {area.recent_reports !== 1 ? t.affectedAreas.reports : t.affectedAreas.report} {t.affectedAreas.inLast24h}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.affectedAreas.latestStatus} <span className="font-semibold">{area.latest_severity}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                      <Droplets className="h-4 w-4" />
                      <span>{t.affectedAreas.noReports}</span>
                    </div>
                  )}
                </div>

                {area.recent_reports > 0 && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          area.latest_severity === "critical"
                            ? "bg-red-500"
                            : area.latest_severity === "high"
                              ? "bg-orange-500"
                              : area.latest_severity === "moderate"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (area.recent_reports / 10) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.affectedAreas.activityLevel}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

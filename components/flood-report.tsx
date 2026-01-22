"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, MapPin, Send, CheckCircle, AlertCircle } from "lucide-react"
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

interface FloodReport {
  id: string
  area_name: string
  severity: string
  description: string
  created_at: string
  user_id: string
}

export function FloodReport() {
  const { t } = useLanguage()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [reports, setReports] = useState<FloodReport[]>([])
  const [selectedArea, setSelectedArea] = useState("")
  const [severity, setSeverity] = useState("moderate")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [affectedAreas, setAffectedAreas] = useState<any[]>([])

  // Load user and reports
  React.useEffect(() => {
    const loadUser = async () => {
      if (!supabase) return

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
          if (profile) {
            setCurrentUser(profile)
          }
        } else {
          setCurrentUser(null)
        }
      } catch (error) {
        console.error("[v0] Error loading user:", error)
        setCurrentUser(null)
      }
    }

    const loadReportsAndAreas = async () => {
      if (!supabase) return

      try {
        // Load affected areas
        const { data: areas } = await supabase.from("affected_areas").select("*").order("name")
        setAffectedAreas(areas || [])

        // Load recent reports
        const { data: reportData } = await supabase
          .from("flood_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
        setReports(reportData || [])
      } catch (error) {
        console.error("[v0] Error loading reports/areas:", error)
      }
    }

    // Initial load
    loadUser()
    loadReportsAndAreas()

    // Listen to auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed:", event, session?.user?.id)
      if (session?.user) {
        // User signed in - load their profile
        try {
          const { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).single()
          if (profile) {
            setCurrentUser(profile)
          }
        } catch (error) {
          console.error("[v0] Error loading user profile after auth change:", error)
        }
      } else {
        // User signed out
        setCurrentUser(null)
      }
    })

    // Set up real-time subscription for reports
    let reportsSubscription: any = null
    if (supabase) {
      reportsSubscription = supabase
        .channel("flood_reports")
        .on("postgres_changes", { event: "*", schema: "public", table: "flood_reports" }, () => {
          loadReportsAndAreas()
        })
        .subscribe()
    }

    return () => {
      authSubscription?.unsubscribe()
      reportsSubscription?.unsubscribe()
    }
  }, [])

  const handleSubmitReport = async () => {
    if (!currentUser || !selectedArea || !severity || !description.trim()) {
      setError(t.floodReport.fillAllFields)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Check for existing report in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existingReports } = await supabase
        .from("flood_reports")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("area_name", selectedArea)
        .gt("created_at", twentyFourHoursAgo)

      if (existingReports && existingReports.length > 0) {
        setError(t.floodReport.alreadyReported)
        setIsLoading(false)
        return
      }

      const { error: reportError } = await supabase.from("flood_reports").insert({
        area_name: selectedArea,
        severity,
        description: description.trim(),
        user_id: currentUser.id,
      })

      if (reportError) throw reportError

      setSuccess(true)
      setDescription("")
      setSeverity("moderate")
      setSelectedArea("")

      // Reload reports
      const { data: updated } = await supabase
        .from("flood_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
      setReports(updated || [])

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || t.floodReport.submitFailed)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "moderate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.floodReport.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.floodReport.signInPrompt}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            {t.floodReport.reportTitle}
          </CardTitle>
          <CardDescription>{t.floodReport.reportDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{t.floodReport.submitSuccess}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label>{t.floodReport.selectArea}</Label>
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger>
                <SelectValue placeholder={t.floodReport.chooseArea} />
              </SelectTrigger>
              <SelectContent>
                {affectedAreas.map((area) => (
                  <SelectItem key={area.id} value={area.name}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t.floodReport.severityLevel}</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t.floodReport.severityLow}</SelectItem>
                <SelectItem value="moderate">{t.floodReport.severityModerate}</SelectItem>
                <SelectItem value="high">{t.floodReport.severityHigh}</SelectItem>
                <SelectItem value="critical">{t.floodReport.severityCritical}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">{t.floodReport.description}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.floodReport.descriptionPlaceholder}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmitReport}
            disabled={isLoading || !selectedArea || !description.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? t.floodReport.submitting : t.floodReport.submitReport}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.floodReport.recentReports}</CardTitle>
          <CardDescription>{t.floodReport.recentReportsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.floodReport.noReports}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {reports.map((report) => (
                <div key={report.id} className="p-3 border rounded-tr-lg rounded-bl-2xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{report.area_name}</p>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                    <Badge className={getSeverityColor(report.severity)}>{report.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

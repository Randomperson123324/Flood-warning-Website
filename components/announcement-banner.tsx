"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Megaphone } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: any = null
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error)
}

interface Announcement {
  id: number
  message: string
  type: "banner" | "popup"
  created_at: string
  is_active: boolean
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [lastAnnouncementId, setLastAnnouncementId] = useState<number | null>(null)
  const [tableExists, setTableExists] = useState(true)

  // Helper function to check if announcement was dismissed
  const isAnnouncementDismissed = (announcementId: number): boolean => {
    if (typeof window === "undefined") return false
    const dismissedKey = `announcement_dismissed_${announcementId}`
    return localStorage.getItem(dismissedKey) === "true"
  }

  // Helper function to show announcement if not dismissed
  const showAnnouncementIfNotDismissed = (announcementData: Announcement, currentLastId: number | null) => {
    // Check if this announcement was dismissed locally
    if (isAnnouncementDismissed(announcementData.id)) {
      console.log("❌ Announcement was dismissed locally, not showing:", announcementData.id)
      setShowBanner(false)
      setShowPopup(false)
      return false
    }

    // Only show if it's a new announcement or different from current
    if (announcementData.id !== currentLastId) {
      console.log("📢 Showing announcement:", announcementData.id)
      setAnnouncement(announcementData)
      setLastAnnouncementId(announcementData.id)

      if (announcementData.type === "popup") {
        setShowPopup(true)
        setShowBanner(false)
        console.log("✅ Showing popup announcement")
      } else {
        setShowBanner(true)
        setShowPopup(false)
        console.log("✅ Showing banner announcement")
      }
      return true
    }
    return false
  }

  const checkForAnnouncement = async () => {
    if (!supabase || !tableExists) {
      return
    }

    try {
      // Get the most recent active announcement
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.log("ℹ️ Announcements table not found - feature disabled")
          setTableExists(false)
          return
        }
        console.error("Error fetching announcements:", error)
        return
      }

      const latestAnnouncement = data?.[0] as Announcement | undefined

      if (latestAnnouncement) {
        showAnnouncementIfNotDismissed(latestAnnouncement, lastAnnouncementId)
      } else {
        // No active announcements
        setShowBanner(false)
        setShowPopup(false)
        setAnnouncement(null)
        setLastAnnouncementId(null)
      }
    } catch (error) {
      console.log("ℹ️ Announcements feature unavailable:", error)
      setTableExists(false)
    }
  }

  // Initial check when component mounts
  useEffect(() => {
    checkForAnnouncement()
  }, [])

  // Real-time subscription for new announcements
  useEffect(() => {
    if (!supabase || !tableExists) return

    const subscription = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        (payload: any) => {
          console.log("📡 Real-time announcement payload:", payload)

          // Only handle INSERT events (new announcements)
          if (payload.eventType === "INSERT" && payload.new) {
            const latestAnnouncement = payload.new as Announcement
            
            // Only show if active and not dismissed
            if (latestAnnouncement.is_active) {
              // Check if dismissed before showing
              if (!isAnnouncementDismissed(latestAnnouncement.id)) {
                setAnnouncement(latestAnnouncement)
                setLastAnnouncementId(latestAnnouncement.id)
                
                if (latestAnnouncement.type === "popup") {
                  setShowPopup(true)
                  setShowBanner(false)
                } else {
                  setShowBanner(true)
                  setShowPopup(false)
                }
              }
            }
          }
          // Handle UPDATE events (e.g., when announcement is activated/deactivated)
          else if (payload.eventType === "UPDATE" && payload.new) {
            const updatedAnnouncement = payload.new as Announcement
            
            if (updatedAnnouncement.is_active) {
              // Check if dismissed before showing
              if (!isAnnouncementDismissed(updatedAnnouncement.id)) {
                setAnnouncement(updatedAnnouncement)
                setLastAnnouncementId(updatedAnnouncement.id)
                
                if (updatedAnnouncement.type === "popup") {
                  setShowPopup(true)
                  setShowBanner(false)
                } else {
                  setShowBanner(true)
                  setShowPopup(false)
                }
              }
            } else {
              // If announcement was deactivated, hide it
              setShowBanner(false)
              setShowPopup(false)
              setAnnouncement(null)
            }
          }
          // Handle DELETE events
          else if (payload.eventType === "DELETE" && payload.old) {
            setShowBanner(false)
            setShowPopup(false)
            setAnnouncement(null)
            setLastAnnouncementId(null)
          }
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [tableExists])


  const handleDismiss = () => {
    if (announcement && typeof window !== "undefined") {
      // Mark this specific announcement as dismissed locally
      const dismissedKey = `announcement_dismissed_${announcement.id}`
      localStorage.setItem(dismissedKey, "true")
      console.log("✅ Announcement dismissed locally (will not show again):", announcement.id)

      // Hide the announcement immediately
      setShowBanner(false)
      setShowPopup(false)
      
      // Keep the announcement data but don't show it
      // This way if a new announcement comes, it will replace this one
    }
  }

  return (
    <>
      {/* Banner */}
      {showBanner && announcement && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <Alert className="border-blue-200 bg-blue-50 shadow-lg">
            <Megaphone className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <div className="font-medium text-blue-800 mb-1">Developer Announcement</div>
                <div className="text-blue-700">{announcement.message}</div>
              </div>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Popup */}
      {showPopup && announcement && (
        <Dialog open={true} onOpenChange={() => handleDismiss()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-600" />
                Developer Announcement
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-base text-gray-700 py-4">{announcement.message}</DialogDescription>
            <div className="flex justify-end">
              <Button onClick={handleDismiss}>OK</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

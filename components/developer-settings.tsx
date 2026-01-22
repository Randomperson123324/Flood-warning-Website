"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings, Shield, Trash2, Plus, AlertTriangle, CheckCircle, MapPin } from "lucide-react"

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

export function DeveloperSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    announcements: [] as Array<{
      id: string
      title: string
      message: string
      type: "info" | "warning" | "error"
      active: boolean
      expiresAt?: string
    }>,
    affectedAreas: [] as Array<{
      id: string
      name: string
      water_level_threshold: number
    }>,
  })

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "error",
    expiresAt: "",
  })

  const [newArea, setNewArea] = useState({
    name: "",
    threshold: 50,
  })

  useEffect(() => {
    const loadAffectedAreas = async () => {
      if (!supabase) return

      try {
        const { data, error } = await supabase.from("affected_areas").select("*")

        if (!error && data) {
          console.log("[v0] Loaded affected areas:", data)
          setSettings((prev) => ({
            ...prev,
            affectedAreas: data.map((area: any) => ({
              id: area.id || area.name,
              name: area.name,
              water_level_threshold: area.water_level_threshold,
            })),
          }))
        }
      } catch (error) {
        console.error("[v0] Error loading affected areas:", error)
      }
    }

    loadAffectedAreas()
  }, [])

  useEffect(() => {
    const loadAnnouncements = async () => {
      if (!supabase) return

      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error

        setSettings((prev) => ({
          ...prev,
          announcements: data || [],
        }))
        console.log("[v0] Loaded announcements:", data)
      } catch (err) {
        console.error("[v0] Error loading announcements:", err)
      }
    }

    loadAnnouncements()
  }, [])

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.message || !newAnnouncement.type) return

    if (!supabase) return console.error("Supabase not initialized")

    try {
      const { error } = await supabase.from("announcements").insert({
        message: newAnnouncement.message,
        type: newAnnouncement.type === "info" ? "banner" : "popup",
        is_active: true,
      })

      if (error) throw error
      console.log("✅ Announcement added to Supabase")

      // Refresh from Supabase
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })
      setSettings((prev) => ({ ...prev, announcements: data || [] }))

      setNewAnnouncement({ title: "", message: "", type: "info", expiresAt: "" })
    } catch (err) {
      console.error("❌ Failed to add announcement:", err)
    }
  }

  const handleDeleteAnnouncement = async (id: number) => {
    if (!supabase) return

    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id)
      if (error) throw error
      console.log("🗑️ Announcement deleted")

      setSettings((prev) => ({
        ...prev,
        announcements: prev.announcements.filter((a) => a.id !== id),
      }))
    } catch (err) {
      console.error("❌ Failed to delete announcement:", err)
    }
  }

  const handleToggleAnnouncement = async (id: number, current: boolean) => {
    if (!supabase) return

    try {
      const { error } = await supabase.from("announcements").update({ is_active: !current }).eq("id", id)
      if (error) throw error
      console.log(`🔄 Announcement ${!current ? "activated" : "deactivated"}`)

      setSettings((prev) => ({
        ...prev,
        announcements: prev.announcements.map((a) => (a.id === id ? { ...a, is_active: !current } : a)),
      }))
    } catch (err) {
      console.error("❌ Failed to toggle announcement:", err)
    }
  }

  const handleAddArea = async () => {
    if (!newArea.name || !newArea.threshold) return

    if (supabase) {
      try {
        console.log("[v0] Adding area:", newArea)
        const { error } = await supabase.from("affected_areas").insert({
          name: newArea.name,
          water_level_threshold: newArea.threshold,
        })

        if (!error) {
          console.log("[v0] Area added successfully, reloading...")
          const { data: updatedAreas } = await supabase.from("affected_areas").select("*")
          if (updatedAreas) {
            setSettings((prev) => ({
              ...prev,
              affectedAreas: updatedAreas.map((area: any) => ({
                id: area.id || area.name,
                name: area.name,
                water_level_threshold: area.water_level_threshold,
              })),
            }))
          }

          setNewArea({ name: "", threshold: 50 })
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 2000)
        } else {
          console.error("[v0] Error adding area:", error)
          setAuthError("Failed to add area")
        }
      } catch (err) {
        console.error("[v0] Exception adding area:", err)
        setAuthError("Failed to add area")
      }
    }
  }

  const handleDeleteArea = async (id: string) => {
    const area = settings.affectedAreas.find((a) => a.id === id)
    if (!area || !supabase) return

    try {
      console.log("[v0] Deleting area:", area.name)
      const { error } = await supabase.from("affected_areas").delete().eq("name", area.name)

      if (!error) {
        console.log("[v0] Area deleted successfully, reloading...")
        const { data: updatedAreas } = await supabase.from("affected_areas").select("*")
        if (updatedAreas) {
          setSettings((prev) => ({
            ...prev,
            affectedAreas: updatedAreas.map((area: any) => ({
              id: area.id || area.name,
              name: area.name,
              water_level_threshold: area.water_level_threshold,
            })),
          }))
        }
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      } else {
        console.error("[v0] Error deleting area:", error)
        setAuthError("Failed to delete area")
      }
    } catch (err) {
      console.error("[v0] Exception deleting area:", err)
      setAuthError("Failed to delete area")
    }
  }
  useEffect(() => {
    const checkUserRole = async () => {
      if (!supabase) return

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()

          if (!error && data && data.role === "dev") {
            setIsAuthenticated(true)
          } else {
            setAuthError("You do not have permission to access developer settings.")
          }
        } else {
          setAuthError("Please log in to access developer settings.")
        }
      } catch (error) {
        console.error("Error checking user role:", error)
        setAuthError("Failed to verify permissions.")
      }
    }

    if (open) {
      checkUserRole()
    }
  }, [open])

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Developer Access
            </DialogTitle>
            <DialogDescription>
              This area is restricted to developers only.
            </DialogDescription>
          </DialogHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
            <Shield className="h-12 w-12 text-muted-foreground opacity-50" />
            <div className="text-center">
              {authError ? (
                <p className="text-destructive font-medium">{authError}</p>
              ) : (
                <p className="text-muted-foreground">Verifying access...</p>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </CardContent>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Developer Settings
          </DialogTitle>
          <DialogDescription>Configure system parameters and affected areas</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Settings saved successfully!</AlertDescription>
            </Alert>
          )}

          {authError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="areas" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="areas">Affected Areas</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>

            <TabsContent value="areas">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Affected Areas Configuration
                  </CardTitle>
                  <CardDescription>Add or remove areas to be monitored for flood reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 border-b pb-4">
                    <h4 className="font-medium">Add New Area</h4>
                    <div>
                      <Label htmlFor="areaName">Area Name</Label>
                      <Input
                        id="areaName"
                        value={newArea.name}
                        onChange={(e) => setNewArea((prev: any) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., School Campus"
                      />
                    </div>

                    <div>
                      <Label>Water Level Threshold: {newArea.threshold}cm</Label>
                      <Slider
                        value={[newArea.threshold]}
                        onValueChange={([value]) => setNewArea((prev: any) => ({ ...prev, threshold: value }))}
                        max={200}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    <Button onClick={handleAddArea} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Area
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Existing Areas</h4>
                    {settings.affectedAreas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No areas configured yet</p>
                    ) : (
                      <div className="space-y-2">
                        {settings.affectedAreas.map((area) => (
                          <div key={area.id} className="flex items-center justify-between p-3 border rounded-tr-lg rounded-bl-2xl">
                            <div className="flex-1">
                              <p className="font-medium">{area.name}</p>
                              <p className="text-sm text-muted-foreground">Threshold: {area.water_level_threshold}cm</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteArea(area.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="announcements">
              <Card>
                <CardHeader>
                  <CardTitle>Create Announcement</CardTitle>
                  <CardDescription>Send system-wide announcements to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement((prev: any) => ({ ...prev, title: e.target.value }))}
                      placeholder="Announcement title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement((prev: any) => ({ ...prev, message: e.target.value }))}
                      placeholder="Announcement message"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newAnnouncement.type}
                        onValueChange={(value: "info" | "warning" | "error") =>
                          setNewAnnouncement((prev: any) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="expires">Expires At</Label>
                      <Input
                        id="expires"
                        type="datetime-local"
                        value={newAnnouncement.expiresAt}
                        onChange={(e) => setNewAnnouncement((prev: any) => ({ ...prev, expiresAt: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button onClick={handleAddAnnouncement} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Announcement
                  </Button>

                  {settings.announcements.length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="font-medium">Active Announcements</h4>
                      {settings.announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className={`p-3 rounded-lg border ${announcement.active ? "bg-background" : "bg-gray-100"}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge
                                variant={
                                  announcement.type === "error"
                                    ? "destructive"
                                    : announcement.type === "warning"
                                      ? "secondary"
                                      : "default"
                                }
                              >
                                {announcement.type}
                              </Badge>
                              <p className="font-medium mt-1">{announcement.title}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{announcement.message}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {announcement.expiresAt &&
                                `Expires: ${new Date(announcement.expiresAt).toLocaleString()}`}
                            </p>
                            <Switch
                              checked={announcement.active}
                              onCheckedChange={() => handleToggleAnnouncement(announcement.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

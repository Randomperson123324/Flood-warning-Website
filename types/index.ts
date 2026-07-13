// ─── Database row shapes (mirrors information_schema.columns from Supabase) ──

export interface Sensor {
  id: string
  sensor_id: string
  label: string
  lat: number
  lon: number
  height_cm: number
  warning_level_cm: number
  danger_level_cm: number
  is_active: boolean
  is_default: boolean
  created_at: string | null
  updated_at: string | null
}

export interface WaterReading {
  id: number
  timestamp: string
  level: number
  temperature: number | null
  sensor_id: string
  created_at?: string | null
}

export interface AffectedArea {
  id: string
  name: string
  water_level_threshold: number
  lat: number | null
  lon: number | null
  description: string | null
  created_at: string | null
  updated_at: string | null
}

export interface SiteSettings {
  id: string
  warning_level_cm: number
  danger_level_cm: number
  sensor_label: string | null
  sensor_lat: number | null
  sensor_lon: number | null
  updated_at: string | null
}

export interface UserProfile {
  id: string
  username: string
  email: string
  is_online: boolean | null
  last_seen: string | null
  created_at: string | null
  role: string
}

// ─── Derived / computed (not DB rows) ─────────────────────────────────────

export type WaterTrend = "rising" | "falling" | "stable"

export type WarningSeverity = "normal" | "warning" | "danger"

export interface TimeToThreshold {
  targetLabel: "warning" | "danger"
  days: number | null
  hours: number | null
  minutes: number | null
  isStable: boolean
}

// ─── Geolocation ───────────────────────────────────────────────────────────

export type LocationSource = "gps" | "ip" | "fallback"

export interface UserLocation {
  lat: number
  lon: number
  source: LocationSource
  /** Only present for source === "ip" — city-level label to show provenance */
  approximateCity?: string
  /** Rough horizontal accuracy in meters, when known (GPS provides this) */
  accuracyMeters?: number
}

export interface SensorWithDistance extends Sensor {
  distanceKm: number
}

// ─── Weather ────────────────────────────────────────────────────────────────

export interface WeatherCurrent {
  temp: number | undefined
  humidity: number | undefined
  windSpeed: number | undefined
  description: string
  descriptionTh: string
  icon: string
  rain: { "1h": number; "24h": number }
}

export interface WeatherForecastDay {
  date: string
  tempMax: number | undefined
  tempMin: number | undefined
  description: string
  descriptionTh: string
  icon: string
  precipitation: number
}

export interface WeatherForecastHour {
  time: string
  temp: number
  description: string
  descriptionTh: string
  icon: string
  precipitation: number
  humidity: number
  windSpeed: number | undefined
}

export interface WeatherData {
  city: string
  country?: string
  coordinates?: { lat: number; lon: number }
  current: WeatherCurrent
  forecast: WeatherForecastDay[]
  hourly: WeatherForecastHour[]
  timestamp: string
  source: string
  fallback?: boolean
}

export interface TMDWarning {
  hasWarning: boolean
  headline?: string
  body?: string
  issuedAt?: string
  source: "TMD"
}

// ─── Community (Phase 2) ────────────────────────────────────────────────────

/** Which Government Data Center card a `/`-command chat message shows —
 * mirrors the sections on /gov-data (minus the forecast, which is long-form
 * text that doesn't work as a chat card). */
export type GovCommandKind = "tmdwarning" | "rainfall" | "river" | "floodalert" | "reservoir"

export interface ChatMessage {
  id: string
  user_id: string | null
  content: string
  reply_to: string | null
  created_at: string | null
  reply_to_content: string | null
  reply_to_username: string | null
  users: { username: string; role: string } | null
  /** Discriminates plain chat text from persisted `/AI` exchanges, `/sensor`
   * cards, and government-data cards — all share the `messages` table so
   * they get realtime + refresh-persistence for free. */
  type: "text" | "ai" | "sensor" | "gov"
  ai_question: string | null
  ai_answer: string | null
  sensor_id: string | null
  gov_kind: GovCommandKind | null
  /** Snapshot of the gov section's data at post time (shape depends on
   * `gov_kind`) — null on legacy cards, which render live data instead. */
  gov_payload: unknown
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  reaction_type: string
  created_at: string | null
}

export type ReportSeverity = "low" | "moderate" | "high" | "critical"

export interface FloodReport {
  id: string
  user_id: string | null
  area_name: string
  severity: ReportSeverity
  description: string
  created_at: string | null
  users: { username: string } | null
}

export interface WeatherVote {
  id: string
  user_id: string | null
  is_raining: boolean | null
  location: string | null
  created_at: string | null
  visitor_id: string | null
}

export interface Announcement {
  id: number
  message: string
  type: string
  created_at: string | null
  is_active: boolean | null
}

// ─── AI assistant (Phase 3) ─────────────────────────────────────────────────

export interface AIMessage {
  role: "user" | "assistant"
  content: string
}

export interface AIContext {
  sensorId?: string
  sensorLat?: number
  sensorLon?: number
  sensorLabel: string
  currentLevel: number
  warningLevel: number
  dangerLevel: number
  trend: WaterTrend
  ratePerHour: number
  weather?: WeatherData | null
  activeFloodReports: number
}

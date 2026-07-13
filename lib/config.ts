// Centralized, env-driven config. Nothing that could reasonably change
// should be a literal inside a component — add it here instead.

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const SITE_CONFIG = {
  site: {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? "StreeFlood",
    // Comma-separated allowed email domains for signup, e.g. "streetrat.ac.th".
    // Empty/unset = open registration (any email domain allowed).
    allowedEmailDomains: (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  },
  fetch: {
    realtimeLimit: num(process.env.NEXT_PUBLIC_REALTIME_LIMIT, 500),
    historyDays: num(process.env.NEXT_PUBLIC_HISTORY_DAYS, 7),
    waterRefreshIntervalMs: num(process.env.NEXT_PUBLIC_WATER_REFRESH_MS, 60_000),
    weatherRefreshIntervalMs: num(process.env.NEXT_PUBLIC_WEATHER_REFRESH_MS, 300_000),
    tmdWarningRefreshIntervalMs: num(process.env.NEXT_PUBLIC_TMD_WARNING_REFRESH_MS, 600_000),
    sensorsRefreshIntervalMs: num(process.env.NEXT_PUBLIC_SENSORS_REFRESH_MS, 300_000),
    // Max readings fetched for a single day on the Archives page — covers
    // minute-resolution sensors (1440/day) with headroom.
    archiveDayLimit: num(process.env.NEXT_PUBLIC_ARCHIVE_DAY_LIMIT, 2000),
    // Government Data Center page: server-side cache lifetime for upstream
    // TMD/ThaiWater responses, client polling cadence, and how many of the
    // wettest rain stations to surface.
    govRevalidateSeconds: num(process.env.GOV_REVALIDATE_SECONDS, 900),
    govRefreshIntervalMs: num(process.env.NEXT_PUBLIC_GOV_REFRESH_MS, 900_000),
    govRainTopStations: num(process.env.GOV_RAIN_TOP_STATIONS, 10),
    // "HII stations near you" section on the dashboard (GPS users only).
    govNearbyStations: num(process.env.GOV_NEARBY_STATIONS, 5),
    // Max river stations listed in the "high/overflowing" list on /gov-data.
    govRiverStations: num(process.env.GOV_RIVER_STATIONS, 8),
    // Max reservoirs listed in the RID "fullest reservoirs" list on /gov-data.
    govReservoirTop: num(process.env.GOV_RESERVOIR_TOP, 8),
    aiAnalysisIntervalMs: num(process.env.NEXT_PUBLIC_AI_ANALYSIS_INTERVAL_MS, 300_000),
    // Shared by both TMD and Open-Meteo providers — keep it one number so the
    // two sources can never silently drift apart on how many hours they return.
    weatherApiTimeoutMs: num(process.env.NEXT_PUBLIC_WEATHER_API_TIMEOUT_MS, 15_000),
    hourlyForecastCount: num(process.env.NEXT_PUBLIC_HOURLY_FORECAST_COUNT, 24),
    dailyForecastDays: num(process.env.NEXT_PUBLIC_DAILY_FORECAST_DAYS, 5),
  },
  geolocation: {
    // Max age (ms) of a cached browser GPS fix that's still considered fresh.
    gpsMaxAgeMs: num(process.env.NEXT_PUBLIC_GPS_MAX_AGE_MS, 5 * 60_000),
    gpsTimeoutMs: num(process.env.NEXT_PUBLIC_GPS_TIMEOUT_MS, 10_000),
    // Re-resolve location every time the app loads (dynamic per visit) — see
    // hooks/use-geolocation.ts. This flag exists for local debugging only.
    cacheAcrossSessions: process.env.NEXT_PUBLIC_GEO_CACHE_ACROSS_SESSIONS === "true",
  },
  map: {
    defaultZoom: num(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM, 13),
    // CARTO's free basemaps (no API key) — chosen specifically because they
    // have a proper dark variant, unlike standard OSM tiles which are
    // always light and clash with the app's dark glass theme.
    tileUrlLight:
      process.env.NEXT_PUBLIC_MAP_TILE_URL_LIGHT ??
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    tileUrlDark:
      process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK ??
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    tileAttribution:
      process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  community: {
    // Mirrors the DB trigger in 002_phase2_community.sql — used purely to
    // show a friendly "wait a moment" hint client-side; the trigger is the
    // real enforcement and can't be bypassed by skipping this.
    messageRateLimitSeconds: num(process.env.NEXT_PUBLIC_MESSAGE_RATE_LIMIT_SECONDS, 3),
    weatherVoteWindowMs: num(process.env.NEXT_PUBLIC_WEATHER_VOTE_COOLDOWN_MS, 30 * 60_000),
    messagesPageSize: num(process.env.NEXT_PUBLIC_MESSAGES_PAGE_SIZE, 50),
    floodReportSuccessDurationMs: num(process.env.NEXT_PUBLIC_FLOOD_REPORT_SUCCESS_MS, 3000),
    chatNoticeDurationMs: num(process.env.NEXT_PUBLIC_CHAT_NOTICE_MS, 2500),
  },
  search: {
    maxResults: num(process.env.NEXT_PUBLIC_SEARCH_MAX_RESULTS, 5),
  },
  gov: {
    // TMD legacy API credentials (data.tmd.go.th/api/*). The public demo pair
    // works but is shared/rate-limited — register at data.tmd.go.th for your
    // own. Server-side only; never NEXT_PUBLIC.
    tmdUid: process.env.TMD_UID ?? "demo",
    tmdUkey: process.env.TMD_UKEY ?? "demokey",
    // Bearer token for TMD's newer nwpapi point forecasts. Currently unused:
    // tokens issued without the forecast scope return empty data — see
    // .env.local for details.
    tmdApiToken: process.env.TMD_API_TOKEN ?? "",
  },
  ai: {
    provider: (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "lmstudio",
    model: process.env.AI_MODEL ?? "gemini-3.1-flash-lite",
    maxHistoryHours: num(process.env.AI_MAX_HISTORY_HOURS, 168),
    lmstudioBaseUrl: process.env.LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234",
    lmstudioModel: process.env.LMSTUDIO_MODEL ?? "local-model",
    maxToolCallLoops: num(process.env.AI_MAX_TOOL_CALL_LOOPS, 5),
  },
} as const

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { SITE_CONFIG } from "@/lib/config"
import { fetchWeather } from "@/lib/weather/weather-provider"
import { fetchTMDWarning } from "@/lib/weather/tmd-warning"
import { searchWeb } from "@/lib/search/search-provider"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolEntry {
  name: string
  description: string
  // ข้อความสั้นๆ ภาษาไทยไว้โชว์ใน UI ตอนที่ AI กำลังเรียก tool นี้อยู่ (เช่น "🔧 กำลังตรวจสอบสภาพอากาศ")
  statusLabel: string
  parameters: Record<string, unknown>
  sources: string[]
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

// ─── Handlers (private) ───────────────────────────────────────────────────────

async function handleGetLatestReading(args: Record<string, unknown>): Promise<unknown> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const sensorId = args.sensorId as string | undefined
  let query = supabase
    .from("water_readings")
    .select("timestamp, level, temperature, sensor_id")
    .order("timestamp", { ascending: false })
    .limit(1)
  if (sensorId) query = query.eq("sensor_id", sensorId)
  const { data } = await query.single()
  if (!data) return null
  return {
    ...data,
    // เพิ่ม timestamp แปลงเป็น timezone ไทยให้ AI อ่านง่าย
    timestamp_thai: new Date(data.timestamp).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
    }),
  }
}

async function handleGetWaterHistory(args: Record<string, unknown>): Promise<unknown> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []
  const sensorId = args.sensorId as string | undefined
  const hours = Math.min(Number(args.hours) || 24, SITE_CONFIG.ai.maxHistoryHours)
  const since = new Date(Date.now() - hours * 3_600_000)
  let query = supabase
    .from("water_readings")
    .select("timestamp, level, temperature")
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: true })
  if (sensorId) query = query.eq("sensor_id", sensorId)
  const { data } = await query
  return data ?? []
}

async function handleGetWeather(args: Record<string, unknown>): Promise<unknown> {
  const lat = Number(args.sensorLat)
  const lon = Number(args.sensorLon)
  const label = (args.sensorLabel as string | undefined) ?? "จุดวัดน้ำ"
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    // No sensor selected on the client side — nothing to fetch weather for.
    return { error: "No sensor selected — cannot fetch weather without coordinates" }
  }
  return fetchWeather({ lat, lon, label })
}

async function handleGetTMDWarning(_args: Record<string, unknown>): Promise<unknown> {
  try {
    return await fetchTMDWarning()
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch TMD warning" }
  }
}

async function handleGetFloodReports(args: Record<string, unknown>): Promise<unknown> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []
  const limit = Number(args.limit) || 10
  const { data } = await supabase
    .from("flood_reports")
    .select("area_name, severity, description, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}

async function handleGetAffectedAreas(_args: Record<string, unknown>): Promise<unknown> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("affected_areas")
    .select("name, water_level_threshold, lat, lon, description")
  return data ?? []
}

async function handleGetSiteSettings(args: Record<string, unknown>): Promise<unknown> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const sensorId = args.sensorId as string | undefined
  let query = supabase.from("sensors").select("sensor_id, label, warning_level_cm, danger_level_cm, lat, lon")
  query = sensorId ? query.eq("sensor_id", sensorId) : query.eq("is_default", true)
  const { data } = await query.limit(1).single()
  return data
}

async function handleSearchWeb(args: Record<string, unknown>): Promise<unknown> {
  return searchWeb(String(args.query ?? ""))
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TOOL_REGISTRY: ToolEntry[] = [
  {
    name: "get_latest_reading",
    description:
      "ดึงค่าระดับน้ำล่าสุดจาก sensor พร้อม timestamp ที่วัดจริง — ใช้เมื่อต้องการรู้ว่าข้อมูลที่แสดงอยู่วัดเมื่อไหร่",
    statusLabel: "กำลังตรวจสอบข้อมูล sensor ล่าสุด...",
    parameters: {
      type: "object",
      properties: {},
    },
    sources: ["Supabase"],
    handler: handleGetLatestReading,
  },
  {
    name: "get_water_history",
    description: "ดึงข้อมูลระดับน้ำย้อนหลังพร้อม timestamp แต่ละจุด เพื่อวิเคราะห์แนวโน้มระยะยาว",
    statusLabel: "กำลังดึงประวัติระดับน้ำย้อนหลัง...",
    parameters: {
      type: "object",
      properties: {
        hours: {
          type: "number",
          description: `จำนวนชั่วโมงย้อนหลัง (สูงสุด ${SITE_CONFIG.ai.maxHistoryHours})`,
        },
      },
      required: ["hours"],
    },
    sources: ["Supabase"],
    handler: handleGetWaterHistory,
  },
  {
    name: "get_weather",
    description:
      "ดึงข้อมูลสภาพอากาศปัจจุบันและพยากรณ์ล่าสุด — response มี field `source` บอกว่าข้อมูลมาจาก TMD หรือ Open-Meteo",
    statusLabel: "กำลังตรวจสอบสภาพอากาศ...",
    parameters: {
      type: "object",
      properties: {},
    },
    sources: ["TMD", "Open-Meteo"],
    handler: handleGetWeather,
  },
  {
    name: "get_tmd_warning",
    description:
      "ดึงประกาศเตือนภัยสภาพอากาศล่าสุดจากกรมอุตุนิยมวิทยา (TMD) เช่น พายุ, ฝนตกหนัก, น้ำท่วมฉับพลัน — ใช้เมื่อถูกถามเรื่องประกาศเตือนภัย/พายุ/สภาพอากาศรุนแรง ไม่ใช่แค่พยากรณ์ปกติ. field `hasWarning: false` แปลว่าไม่มีประกาศเตือนภัยขณะนี้",
    statusLabel: "กำลังตรวจสอบประกาศเตือนภัยจาก TMD...",
    parameters: {
      type: "object",
      properties: {},
    },
    sources: ["TMD"],
    handler: handleGetTMDWarning,
  },
  {
    name: "get_flood_reports",
    description: "ดึงรายงานน้ำท่วมล่าสุดจากชุมชน",
    statusLabel: "กำลังดึงรายงานน้ำท่วมจากชุมชน...",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "จำนวนรายงาน (default 10)" },
      },
    },
    sources: ["Supabase"],
    handler: handleGetFloodReports,
  },
  {
    name: "get_affected_areas",
    description: "ดึงรายการพื้นที่เสี่ยงและเกณฑ์ระดับน้ำ",
    statusLabel: "กำลังดึงรายการพื้นที่เสี่ยง...",
    parameters: {
      type: "object",
      properties: {},
    },
    sources: ["Supabase"],
    handler: handleGetAffectedAreas,
  },
  {
    name: "get_site_settings",
    description: "ดึงเกณฑ์เตือนภัยและการตั้งค่าไซต์",
    statusLabel: "กำลังดึงการตั้งค่าไซต์...",
    parameters: {
      type: "object",
      properties: {},
    },
    sources: ["Supabase"],
    handler: handleGetSiteSettings,
  },
  {
    name: "search_web",
    description: "ค้นหาข้อมูลเพิ่มเติมจากอินเทอร์เน็ต เช่น ข่าวน้ำท่วม สภาพอากาศ เหตุการณ์ล่าสุด",
    statusLabel: "กำลังค้นหาข้อมูลเพิ่มเติมจากอินเทอร์เน็ต...",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "คำค้นหา" },
      },
      required: ["query"],
    },
    sources: ["Web Search"],
    handler: handleSearchWeb,
  },
]

// ─── Registry helpers ─────────────────────────────────────────────────────────

/** Execute a tool by name. `sensorContext` (from the client's current
 * selected sensor) is merged into every tool call's args automatically —
 * individual tools don't need the AI model to guess a sensor_id itself. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  sensorContext?: { sensorId?: string; sensorLat?: number; sensorLon?: number; sensorLabel?: string },
): Promise<unknown> {
  const entry = TOOL_REGISTRY.find((t) => t.name === name)
  if (!entry) return { error: `Unknown tool: ${name}` }
  return entry.handler({ ...args, ...sensorContext })
}

/** ดึงข้อความสั้นๆ ของ tool ตามชื่อ ไว้โชว์ใน UI ตอนกำลังเรียก — ถ้าไม่รู้จัก tool ก็คืน fallback ทั่วไป */
export function getToolStatusLabel(name: string): string {
  const entry = TOOL_REGISTRY.find((t) => t.name === name)
  return entry?.statusLabel ?? `กำลังเรียกใช้ ${name}...`
}

/** Get all unique data sources across all tools */
export function getAllSources(): string[] {
  const seen = new Set<string>()
  for (const tool of TOOL_REGISTRY) {
    for (const src of tool.sources) seen.add(src)
  }
  return Array.from(seen)
}

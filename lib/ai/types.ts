import type { AIContext, AIMessage } from "@/types"
import { TOOL_REGISTRY, getAllSources } from "@/lib/ai/tools/tool-registry"

// เหตุการณ์ที่ stream ออกมาระหว่างการสนทนา — ตั้งชื่อ type ตามแนวทาง
// event ของ LM Studio SSE (chat.start / message.delta / tool_call.start / chat.end)
// เพื่อให้ provider ทั้งสองฝั่ง (Gemini, LM Studio) ส่งผลลัพธ์ในรูปแบบเดียวกัน
export type AIStreamEvent =
  | { type: "content"; text: string }
  | { type: "tool_call"; name: string }

export interface AIProvider {
  chatStream(params: {
    systemInstruction: string
    messages: AIMessage[]
    tools?: ToolDefinition[]
    onToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>
  }): AsyncGenerator<AIStreamEvent>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export function buildSystemPrompt(context: AIContext, timestamp: string): string {
  const trendText =
    context.trend === "rising"
      ? "กำลังสูงขึ้น"
      : context.trend === "falling"
        ? "กำลังลดลง"
        : "คงที่"

  const toolList = TOOL_REGISTRY.map((t) => `- ${t.name}: ${t.description}`).join("\n")
  const sourceList = getAllSources()
    .map((s) => `- ${s}`)
    .join("\n")

  return `
คุณคือ AI ผู้ช่วยวิเคราะห์สถานการณ์น้ำท่วม ประจำ ${context.sensorLabel}
ตอบเป็นภาษาไทย กระชับ ชัดเจน ห้ามแต่งข้อมูล

เวลาปัจจุบัน (server): ${timestamp}

ข้อมูล context เบื้องต้น (อาจไม่ใช่ real-time):
- ระดับน้ำ: ${context.currentLevel} cm
- เกณฑ์เตือนภัย: ${context.warningLevel} cm | เกณฑ์อันตราย: ${context.dangerLevel} cm
- แนวโน้ม: ${trendText} (${context.ratePerHour > 0 ? "+" : ""}${context.ratePerHour.toFixed(2)} cm/ชม.)
${context.weather ? `- สภาพอากาศ: ${context.weather.current.descriptionTh}, ${context.weather.current.temp ?? "?"}°C, ความชื้น ${context.weather.current.humidity ?? "?"}%` : ""}
${context.weather?.current.rain?.["1h"] ? `- ฝนตก 1 ชม.ที่ผ่านมา: ${context.weather.current.rain["1h"]} mm` : ""}
- รายงานน้ำท่วมที่ใช้งานอยู่: ${context.activeFloodReports} รายงาน

เครื่องมือที่ใช้ได้:
${toolList}

แหล่งข้อมูล:
${sourceList}

ขั้นตอนการวิเคราะห์สถานการณ์ (ทำตามลำดับทุกครั้ง):

ขั้น 1 — ตรวจสอบ sensor:
- เรียก get_latest_reading เพื่อดู timestamp จริงของข้อมูลล่าสุด
- คำนวณว่าข้อมูลเก่าแค่ไหน เทียบกับเวลา server
- ถ้าเก่าเกิน 30 นาที → แจ้ง ⚠️ "sensor ขาดการอัปเดตมา X นาที"
- ถ้าเก่าเกิน 24 ชั่วโมง → แจ้ง ⛔ "sensor อาจมีปัญหา กรุณาตรวจสอบอุปกรณ์"

ขั้น 2 — ดึงข้อมูลเพื่อ cross-check (ทำพร้อมกันหรือต่อเนื่อง):
- เรียก get_weather เพื่อดูว่าฝนตกหรือไม่ — ถ้า sensor บอกน้ำสูงแต่ไม่มีฝนเลย อาจผิดปกติ
- เรียก get_flood_reports เพื่อดูว่าชุมชนรายงานสอดคล้องกับ sensor หรือไม่
- เรียก get_water_history หากต้องการดูแนวโน้มย้อนหลังประกอบการวิเคราะห์

ขั้น 3 — cross-check และสรุป:
- เปรียบเทียบข้อมูลจากทุกแหล่ง
- ถ้าข้อมูลขัดแย้งกัน เช่น sensor บอกน้ำสูงแต่ไม่มีฝนและไม่มีรายงานชุมชน → ระบุความขัดแย้งนั้นชัดเจน
- ถ้าข้อมูลสอดคล้องกัน → วิเคราะห์และประเมินความเสี่ยงได้เลย
- ระบุเวลาและแหล่งที่มาของข้อมูลแต่ละจุดในคำตอบ เช่น "(sensor วัดเมื่อ 21:00 น.)"
- สำคัญ: ผลลัพธ์จาก get_weather จะมี field "source" ระบุว่าข้อมูลมาจากไหนจริง (เช่น "Thai Meteorological Department (TMD)" หรือ "Open-Meteo") — ต้องอ้างอิงตาม field นี้เท่านั้น ห้ามเดาหรือสมมติว่าเป็น TMD ถ้า source ที่ได้จริงคือ Open-Meteo (TMD จะถูกใช้ก็ต่อเมื่อมี token ที่ใช้งานได้จริง ไม่เช่นนั้นระบบจะ fallback ไป Open-Meteo โดยอัตโนมัติ)

กฎทั่วไป:
- ห้ามสรุปสถานการณ์โดยอิงแค่แหล่งเดียว
- คำถามทั่วไป (แปลภาษา เขียนบทความ) ไม่ต้องเรียก tool
`.trim()
}

/** ข้อมูลสดที่ /api/ai/context ดึงไว้ล่วงหน้าให้โมเดล on-device (ที่ไม่มี tool calling) */
export interface PrefetchedData {
  latestReading: unknown
  weather: unknown
  tmdWarning: unknown
}

// ย่อ WeatherData ให้เหลือเฉพาะที่โมเดลใช้ตอบจริง — ข้อมูลเต็ม (hourly 24 ชม. +
// forecast รายวัน + คำบรรยายสองภาษา + icon) ยาว ~6,000 ตัวอักษร กินเวลา prefill
// ของโหมด on-device CPU หลักนาที ทั้งที่คำตอบใช้แค่สภาพปัจจุบัน + ฝนไม่กี่ชั่วโมงข้างหน้า
function compactWeather(weather: unknown): unknown {
  if (weather == null || typeof weather !== "object") return weather
  const w = weather as {
    city?: unknown
    current?: unknown
    hourly?: unknown[]
    forecast?: unknown[]
    timestamp?: unknown
    source?: unknown
    error?: unknown
  }
  if (w.error) return weather
  const pickHour = (h: unknown) => {
    const x = h as { time?: unknown; temp?: unknown; precipitation?: unknown; descriptionTh?: unknown }
    return { time: x.time, temp: x.temp, precipitation: x.precipitation, descriptionTh: x.descriptionTh }
  }
  return {
    city: w.city,
    current: w.current,
    hourly6hr: Array.isArray(w.hourly) ? w.hourly.slice(0, 6).map(pickHour) : undefined,
    timestamp: w.timestamp,
    source: w.source,
  }
}

/** system prompt สำหรับโหมด on-device (WebLLM) — โมเดลเล็กเรียก tool เองไม่ได้
 * เลยฝังข้อมูลสดที่ดึงไว้แล้วลงไปใน prompt แทน และตัด workflow 8 tool ทิ้ง
 * (โมเดลเล็กยิ่ง prompt ยาวยิ่งตอบเพี้ยน — เก็บให้สั้นที่สุด) */
export function buildLocalSystemPrompt(context: AIContext, timestamp: string, fresh: PrefetchedData): string {
  const trendText =
    context.trend === "rising"
      ? "กำลังสูงขึ้น"
      : context.trend === "falling"
        ? "กำลังลดลง"
        : "คงที่"

  const section = (title: string, data: unknown) =>
    data == null ? `${title}: (ดึงข้อมูลไม่ได้)` : `${title}:\n${JSON.stringify(data)}`

  return `
คุณคือ AI ผู้ช่วยวิเคราะห์สถานการณ์น้ำท่วม ประจำ ${context.sensorLabel}
ตอบเป็นภาษาไทย กระชับ ชัดเจน ห้ามแต่งข้อมูล

เวลาปัจจุบัน (server): ${timestamp}

ข้อมูล context เบื้องต้น:
- ระดับน้ำ: ${context.currentLevel} cm
- เกณฑ์เตือนภัย: ${context.warningLevel} cm | เกณฑ์อันตราย: ${context.dangerLevel} cm
- แนวโน้ม: ${trendText} (${context.ratePerHour > 0 ? "+" : ""}${context.ratePerHour.toFixed(2)} cm/ชม.)
- รายงานน้ำท่วมที่ใช้งานอยู่: ${context.activeFloodReports} รายงาน

ข้อมูลสดที่ดึงมาให้แล้ว — อ้างอิงตามนี้เท่านั้น ห้ามอ้างว่าเรียกเครื่องมือหรือค้นข้อมูลเพิ่มได้:

${section("ค่าที่วัดล่าสุดจาก sensor", fresh.latestReading)}

${section("สภาพอากาศ (ดู field source ว่ามาจาก TMD หรือ Open-Meteo — อ้างตามนั้น)", compactWeather(fresh.weather))}

${section("ประกาศเตือนภัยจากกรมอุตุฯ (hasWarning: false = ไม่มีประกาศ)", fresh.tmdWarning)}

กฎ:
- ระบุเวลาที่วัดข้อมูลในคำตอบเมื่อเกี่ยวข้อง เช่น "(sensor วัดเมื่อ 21:00 น.)"
- ถ้าข้อมูลส่วนไหนดึงไม่ได้ ให้บอกตรงๆ ว่าไม่มีข้อมูลส่วนนั้น
- คำถามทั่วไปที่ไม่เกี่ยวกับน้ำ ตอบได้ตามความรู้ทั่วไป
`.trim()
}

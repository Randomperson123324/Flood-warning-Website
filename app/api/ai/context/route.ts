import { NextRequest } from "next/server"
import { buildLocalSystemPrompt } from "@/lib/ai/types"
import { executeTool } from "@/lib/ai/tools/tool-registry"
import type { AIContext } from "@/types"

interface ContextRequest {
  context: AIContext
}

// สำหรับโหมด on-device AI (WebLLM): โมเดลเล็กในเบราว์เซอร์เรียก tool เองไม่ได้
// endpoint นี้เลยดึงข้อมูลสด (ค่าวัดล่าสุด / สภาพอากาศ / ประกาศ TMD) ฝั่ง server
// ด้วย tool handler ชุดเดิม แล้วประกอบเป็น system prompt ส่งกลับไปให้ client ยัดใส่โมเดล
export async function POST(req: NextRequest) {
  let body: ContextRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const { context } = body
  if (!context?.sensorLabel) {
    return new Response(JSON.stringify({ error: "No context provided" }), { status: 400 })
  }

  const sensorContext = {
    sensorId: context.sensorId,
    sensorLat: context.sensorLat,
    sensorLon: context.sensorLon,
    sensorLabel: context.sensorLabel,
  }

  const [latestReading, weather, tmdWarning] = await Promise.allSettled([
    executeTool("get_latest_reading", {}, sensorContext),
    executeTool("get_weather", {}, sensorContext),
    executeTool("get_tmd_warning", {}, sensorContext),
  ]).then((results) => results.map((r) => (r.status === "fulfilled" ? r.value : null)))

  const timestamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
  const systemPrompt = buildLocalSystemPrompt(context, timestamp, { latestReading, weather, tmdWarning })

  return new Response(JSON.stringify({ systemPrompt }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  })
}

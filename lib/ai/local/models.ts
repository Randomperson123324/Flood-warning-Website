// รายชื่อโมเดล on-device ที่รองรับ — ตอนนี้มีตัวเดียว (Qwen3 4B) ตามที่ตกลงกัน
// โครงสร้างเป็น list เผื่ออนาคตเพิ่มรุ่นเล็ก/ใหญ่ได้โดยไม่ต้องแก้ UI
// id ต้องตรงกับ prebuiltAppConfig.model_list ของ @mlc-ai/web-llm เวอร์ชันที่ติดตั้ง

export interface LocalModelInfo {
  id: string
  label: string
  sizeText: string
  vramMB: number
}

export const LOCAL_MODELS: LocalModelInfo[] = [
  {
    // ยืนยันกับ web-llm 0.2.84 แล้ว: vram_required_MB = 3431.59, ctx 4096
    id: "Qwen3-4B-q4f16_1-MLC",
    label: "Qwen3 4B",
    sizeText: "~2.5 GB",
    vramMB: 3432,
  },
]

export const DEFAULT_LOCAL_MODEL_ID = LOCAL_MODELS[0].id

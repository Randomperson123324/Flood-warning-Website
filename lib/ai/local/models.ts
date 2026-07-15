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

// รุ่น q4f32 สำหรับ GPU ที่ไม่มี WebGPU feature "shader-f16" — shader ของรุ่น q4f16
// ขึ้นต้นด้วย `enable f16;` และจะ compile ไม่ผ่าน (GPUValidationError) บนเครื่องพวกนั้น
// key = id ของรุ่น f16 หลัก | ยืนยันกับ web-llm 0.2.84: vram_required_MB = 4327.71, ctx 4096
export const F32_FALLBACKS: Record<string, LocalModelInfo> = {
  "Qwen3-4B-q4f16_1-MLC": {
    id: "Qwen3-4B-q4f32_1-MLC",
    label: "Qwen3 4B",
    sizeText: "~2.9 GB",
    vramMB: 4328,
  },
}

export function getLocalModelInfo(id: string): LocalModelInfo {
  return (
    LOCAL_MODELS.find((m) => m.id === id) ??
    Object.values(F32_FALLBACKS).find((m) => m.id === id) ??
    LOCAL_MODELS[0]
  )
}

// id ทุก variant (f16/f32) ของโมเดลตัวเดียวกัน — ใช้ตอนลบ ให้เคลียร์ไฟล์ที่อาจ
// ค้างจาก variant ที่เคยดาวน์โหลดก่อนสลับ fallback
export function variantIds(id: string): string[] {
  for (const [f16Id, f32] of Object.entries(F32_FALLBACKS)) {
    if (id === f16Id || id === f32.id) return [f16Id, f32.id]
  }
  return [id]
}

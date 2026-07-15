// รายชื่อโมเดล on-device ที่รองรับ — ตอนนี้มีตัวเดียว (Qwen3 4B) ตามที่ตกลงกัน
// โครงสร้างเป็น list เผื่ออนาคตเพิ่มรุ่นเล็ก/ใหญ่ได้โดยไม่ต้องแก้ UI
// id ต้องตรงกับ prebuiltAppConfig.model_list ของ @mlc-ai/web-llm เวอร์ชันที่ติดตั้ง

export interface LocalModelInfo {
  id: string
  label: string
  sizeText: string
  vramMB: number
  /** key คำอธิบายสั้นในหมวด ai ของ dictionaries.ts */
  descKey: "modelDescQuality" | "modelDescLight" | "modelDescCpu"
}

export const LOCAL_MODELS: LocalModelInfo[] = [
  {
    // ยืนยันกับ web-llm 0.2.84 แล้ว: vram_required_MB = 3431.59, ctx 4096
    id: "Qwen3-4B-q4f16_1-MLC",
    label: "Qwen3 4B",
    sizeText: "~2.5 GB",
    vramMB: 3432,
    descKey: "modelDescQuality",
  },
  {
    // ยืนยันกับ web-llm 0.2.84 แล้ว: vram_required_MB = 2036.66, ctx 4096
    id: "Qwen3-1.7B-q4f16_1-MLC",
    label: "Qwen3 1.7B",
    sizeText: "~1.1 GB",
    vramMB: 2037,
    descKey: "modelDescLight",
  },
]

export const DEFAULT_LOCAL_MODEL_ID = LOCAL_MODELS[0].id

// รุ่น q4f32 สำหรับ GPU ที่ไม่มี WebGPU feature "shader-f16" — shader ของรุ่น q4f16
// ขึ้นต้นด้วย `enable f16;` และจะ compile ไม่ผ่าน (GPUValidationError) บนเครื่องพวกนั้น
// key = id ของรุ่น f16 หลัก | vram ยืนยันกับ web-llm 0.2.84
export const F32_FALLBACKS: Record<string, LocalModelInfo> = {
  "Qwen3-4B-q4f16_1-MLC": {
    id: "Qwen3-4B-q4f32_1-MLC",
    label: "Qwen3 4B",
    sizeText: "~2.9 GB",
    vramMB: 4328,
    descKey: "modelDescQuality",
  },
  "Qwen3-1.7B-q4f16_1-MLC": {
    id: "Qwen3-1.7B-q4f32_1-MLC",
    label: "Qwen3 1.7B",
    sizeText: "~1.2 GB",
    vramMB: 2635,
    descKey: "modelDescLight",
  },
}

// แปลง id variant ใดๆ กลับเป็น id หลัก (รุ่น f16) — ใช้เป็นค่า canonical ตอนเก็บ/เลือก
export function canonicalModelId(id: string): string {
  for (const [f16Id, f32] of Object.entries(F32_FALLBACKS)) {
    if (id === f32.id) return f16Id
  }
  return id
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

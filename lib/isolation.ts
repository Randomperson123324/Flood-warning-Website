// โซน cross-origin isolation ของแอป (คู่กับ headers() ใน next.config.mjs)
//
// หน้าในโซน isolated ส่ง COOP/COEP เพื่อให้ AI บนเครื่องโหมด CPU (wllama) ใช้
// SharedArrayBuffer → รัน multi-thread ได้ ส่วนหน้าที่ใช้ Cloudflare Turnstile
// (/community และ /auth/*) เปิดไม่ได้ เพราะ COEP บล็อก iframe ของ Turnstile
//
// สำคัญ: COOP/COEP ผูกกับ "เอกสาร" ที่โหลดครั้งแรก ไม่ใช่ URL ปัจจุบัน — การนำทาง
// แบบ client-side (next/link) ไม่เปลี่ยนเอกสาร นโยบายเดิมจึงติดไปทั้งเซสชัน
// ข้ามโซนเมื่อไหร่ต้องโหลดหน้าใหม่ทั้งเอกสาร (<a> ธรรมดา) ให้ header ของปลายทางมีผล

const ISOLATED_ROUTES = ["/", "/archives", "/gov-data", "/notifications", "/dev-settings"]

export function isIsolatedRoute(path: string): boolean {
  return ISOLATED_ROUTES.some((r) => path === r || (r !== "/" && path.startsWith(`${r}/`)))
}

/** true = จาก→ไป อยู่คนละโซน ต้องนำทางแบบโหลดเอกสารใหม่ */
export function crossesIsolationZone(from: string, to: string): boolean {
  return isIsolatedRoute(from) !== isIsolatedRoute(to)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
    ],
  },
  // เปิด cross-origin isolation บนทุกหน้าที่ไม่ใช้ Turnstile เพื่อให้ AI บนเครื่อง
  // โหมด CPU (wllama) ใช้ SharedArrayBuffer → รัน multi-thread ได้ (เร็วกว่า
  // single-thread หลายเท่า) — รายชื่อโซนต้องตรงกับ ISOLATED_ROUTES ใน lib/isolation.ts
  //
  // ทำไมไม่เปิดทุกหน้า: COEP บล็อก iframe ข้าม origin ที่ไม่ได้ opt-in ซึ่งรวมถึง
  // Cloudflare Turnstile — ที่ใช้อยู่บน /auth/login, /auth/signup และฟอร์มรายงาน
  // น้ำท่วมใน /community หน้าเหล่านั้น (คำสั่ง /AI ในแชท) wllama ถอยไป single-thread เอง
  //
  // นโยบายผูกกับเอกสารที่โหลดครั้งแรก ไม่ใช่ URL — การนำทางข้ามโซนต้องโหลดเอกสารใหม่
  // (ZoneLink ใน components/zone-link.tsx จัดการให้) ไม่งั้น header ปลายทางไม่มีผล
  //
  // credentialless (ไม่ใช่ require-corp): แผนที่ CARTO โหลดผ่าน <img> แบบ no-cors
  // และ CDN ไม่ได้ส่ง CORP มา — credentialless จึงยอมให้โหลดโดยตัด credential ทิ้ง
  async headers() {
    const isolation = [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
    ]
    return [
      { source: "/", headers: isolation },
      { source: "/archives", headers: isolation },
      { source: "/gov-data", headers: isolation },
      { source: "/notifications", headers: isolation },
      { source: "/dev-settings", headers: isolation },
      // ถ้าจะเพิ่ม Web Worker ที่โหลดสคริปต์ผ่าน network บนหน้าที่เปิด COEP ไว้ ต้องส่ง
      // COEP บน response ของสคริปต์ worker เองด้วย (สเปก "check a global object's
      // embedder policy" — inherit ไม่พอ same-origin ก็ไม่ได้รับยกเว้น) ไม่งั้น Chrome
      // บล็อกด้วย CoepFrameResourceNeedsCoepHeader ตั้งแต่ตอนสร้าง
      // ตอนนี้ไม่มี worker แบบนั้นแล้ว — GPU ใช้ main thread ส่วน wllama สร้างจาก blob URL
    ]
  },
}

export default nextConfig

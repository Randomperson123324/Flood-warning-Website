/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
    ],
  },
  // เปิด cross-origin isolation เฉพาะหน้าแรก เพื่อให้ AI บนเครื่องโหมด CPU (wllama)
  // ใช้ SharedArrayBuffer → รัน multi-thread ได้ (เร็วกว่า single-thread หลายเท่า)
  //
  // ทำไมเฉพาะหน้าแรก: COEP บล็อก iframe ข้าม origin ที่ไม่ได้ opt-in ซึ่งรวมถึง
  // Cloudflare Turnstile — ที่ใช้อยู่บน /auth/login, /auth/signup และฟอร์มรายงาน
  // น้ำท่วมใน /community หน้าแรกไม่มี Turnstile จึงเปิดได้อย่างปลอดภัย
  // ส่วน /community (คำสั่ง /AI ในแชท) wllama จะถอยไป single-thread ให้เองอัตโนมัติ
  //
  // credentialless (ไม่ใช่ require-corp): แผนที่ CARTO โหลดผ่าน <img> แบบ no-cors
  // และ CDN ไม่ได้ส่ง CORP มา — credentialless จึงยอมให้โหลดโดยตัด credential ทิ้ง
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ]
  },
}

export default nextConfig

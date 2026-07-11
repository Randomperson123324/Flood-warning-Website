# StreeFlood — Phase 1 + 2 + 3 + 4

ระบบเฝ้าระวังน้ำท่วมและสภาพอากาศแบบเรียลไทม์
- **Phase 1**: โครงสร้างโปรเจกต์ + dashboard หลัก (ระดับน้ำเรียลไทม์, กราฟย้อนหลัง, สภาพอากาศ, แผนที่, geolocation, ธีม/ภาษาอัตโนมัติ)
- **Phase 2**: ระบบสมาชิก (Supabase Auth), ชุมชน/แชท realtime พร้อม reaction+reply+rate-limit, แจ้งเหตุน้ำท่วม + Turnstile, โหวตสภาพอากาศ, ประกาศจากทีมพัฒนา
- **Phase 3**: ผู้ช่วย AI (Gemini/LM Studio) เรียก tool ดึงข้อมูลจริงเอง + ค้นเว็บด้วย Tavily (ไม่ใช้ DuckDuckGo ง่อยๆ อีกต่อไป)
- **Phase 4** (ใหม่): notification center (สถานะ sensor ทุกจุด + แจ้งเตือนเบราว์เซอร์เมื่อระดับน้ำขึ้นระดับเฝ้าระวัง/อันตราย)
  + developer settings (จัดการ sensor/พื้นที่เสี่ยง/ประกาศ ผ่านหน้าเว็บ ไม่ต้องรัน SQL เอง — ใช้ RLS เดิมจาก Phase 1/2 ทั้งหมด)

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.example .env.local   # แล้วกรอกค่าตามด้านล่าง
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

### ตัวแปรที่ต้องตั้งค่า (`.env.local`)

| ตัวแปร | จำเป็นไหม | หมายเหตุ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **ต้องมี** | Settings → API ใน Supabase dashboard |
| `TMD_API_TOKEN` | ไม่บังคับ | ถ้าไม่ตั้ง จะใช้ Open-Meteo แทนอัตโนมัติ |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | ไม่บังคับ | ใช้จริงตอน Phase 2 (auth) — ปล่อยว่าง = เปิดรับทุกอีเมล |

ตัวแปรอื่น ๆ (refresh interval, geolocation timeout, map tile ฯลฯ) ดูได้ใน `.env.example` และ `lib/config.ts` — ทุกค่ามี default ที่ใช้งานได้เลยไม่ต้องตั้งก็ได้

### ตั้งค่าฐานข้อมูล

รันตามลำดับใน Supabase SQL editor:
1. `scripts/sql/001_phase1_schema.sql` — `users`, `sensors`, `water_readings`, `affected_areas`, `site_settings` + RLS + seed sensor เริ่มต้น
2. `scripts/sql/002_phase2_community.sql` — `messages`, `message_reactions`, `flood_reports`, `weather_votes`, `announcements` + RLS + trigger กัน spam แชท + เปิด realtime publication ให้ทุกตารางที่ต้องใช้

### Supabase Auth settings

ไปที่ Authentication → Email templates/URL configuration ใน Supabase dashboard แล้วตั้ง **Redirect URLs** ให้รวม
`http://localhost:3000/auth/callback` (และโดเมนจริงตอน deploy) ไม่งั้นลิงก์ยืนยันอีเมลจะพาไปหน้าผิด

## โครงสร้างโปรเจกต์

```
app/
  layout.tsx              root layout: fonts, providers, metadata
  page.tsx                dashboard page (ประกอบ hook + component ทั้งหมด)
  globals.css             design tokens (สี/glass/animation) — แก้ที่นี่ที่เดียว
  community/page.tsx      หน้าชุมชน: แชท / รายงานน้ำท่วม / โหวตอากาศ
  notifications/page.tsx  notification center: สถานะ sensor ทุกจุด + เปิดแจ้งเตือนเบราว์เซอร์
  dev-settings/page.tsx   จัดการ sensor/พื้นที่เสี่ยง/ประกาศ (role='dev' เท่านั้น)
  auth/
    login/page.tsx, signup/page.tsx
    callback/route.ts      แลก code เป็น session + สร้างแถว users
    confirm-success/, auth-code-error/
  api/
    geo/route.ts               IP geolocation fallback (server-side, ไม่ต้องใช้ key)
    weather/route.ts           พยากรณ์อากาศ (TMD → Open-Meteo fallback)
    weather/warning/route.ts   ประกาศเตือนภัยจาก TMD
    weather/vote/route.ts      โหวต "ฝนตกไหม" + กันโหวตซ้ำ (server-side cooldown)
    flood-reports/route.ts     รับรายงานน้ำท่วม — ตรวจ Turnstile ก่อน insert
    turnstile-sitekey/route.ts ส่ง site key ให้ client (อ่านจาก env ฝั่ง server)
    ai/route.ts                 stream คำตอบ AI (SSE) + tool-calling loop
lib/
  config.ts               ← ค่าที่ปรับแต่งได้ทั้งหมดอยู่ที่นี่ (env-driven)
  water-analysis.ts        คำนวณ trend / rate / time-to-threshold (pure functions)
  weather/                 provider เดิมจากโปรเจกต์ก่อนหน้า (ใช้ซ้ำได้เลย)
  search/search-provider.ts  Tavily (ค้นเว็บจริงสำหรับ AI) → DuckDuckGo fallback อัตโนมัติ
  supabase/                client (browser) + server factory
  auth/email-domain.ts     ตรวจโดเมนอีเมลตอนสมัคร (ตั้งค่าผ่าน env)
  turnstile.ts             ตรวจ token กับ Cloudflare ฝั่ง server
  i18n/dictionaries.ts     ข้อความ TH/EN ทั้งหมด
  ai/
    types.ts                 AIProvider interface + system prompt builder
    providers/gemini.ts, lmstudio.ts
    tools/tool-registry.ts   tool ทั้งหมดที่ AI เรียกได้ (single source of truth)
    tools/definitions.ts     แปลง registry → รูปแบบ Gemini/OpenAI function-calling
hooks/
  use-geolocation.ts       GPS → IP fallback, resolve ใหม่ทุกครั้งที่เข้า
  use-sensors.ts           รายชื่อ sensor + หา sensor ใกล้ผู้ใช้ที่สุด
  use-water-data.ts        realtime reading + history ต่อ sensor
  use-weather-data.ts
  use-latest-readings.ts   latest reading ของทุก sensor (สำหรับสีบนแผนที่)
  use-language.tsx         ภาษา (default ตามระบบ browser)
  use-auth.tsx             session, profile, signUp/signIn/signOut
  use-community-chat.ts    ข้อความ realtime + ส่งข้อความ (rate-limit จาก DB trigger)
  use-message-reactions.ts reaction count ต่อข้อความ + toggle
  use-flood-reports.ts     รายงานน้ำท่วม realtime + ส่งผ่าน API (Turnstile)
  use-weather-vote.ts      โหวตอากาศ + cooldown (server-verified)
  use-announcements.ts     ประกาศที่ active อยู่ (realtime)
  use-ai-chat.ts           stream แชท AI + auto-analysis เมื่อระดับน้ำเปลี่ยน
  use-browser-notifications.tsx  global watcher: severity ทุก sensor + ยิง Notification เมื่อ escalate
  use-manage-sensors.ts, use-manage-affected-areas.ts, use-manage-announcements.ts  CRUD สำหรับ dev-settings
components/
  theme-provider.tsx        next-themes (default: system)
  header.tsx                nav + auth state + badge แจ้งเตือน + ลิงก์ dev-settings (เห็นเฉพาะ dev)
  announcement-banner.tsx
  dashboard/                การ์ดต่าง ๆ บน dashboard
  community/                chat-panel, message-item, flood-report-form/list, weather-vote-widget
  auth/                      auth-shell (glass form wrapper ใช้ร่วมกัน)
  ai-assistant/              ปุ่มลอย + panel แชท + markdown renderer
  notifications/             sensor-status-list, notification-permission-card, announcements-list
  dev-settings/              require-dev guard + sensor/area/announcement manager
  turnstile-widget.tsx      โหลด Cloudflare widget เอง ไม่ทำอะไรถ้าไม่มี key
scripts/sql/               migration scripts (001 = phase 1, 002 = phase 2)
types/index.ts              type ทั้งหมด (ตรงกับ schema Supabase)
```

## ดีไซน์ — "Liquid glass"

Design tokens ทั้งหมดอยู่ใน `tailwind.config.ts` (สี, radius, shadow, animation) และ `app/globals.css`
(CSS variables สำหรับ light/dark) — ต้องการเปลี่ยนธีมสี ให้แก้ที่ 2 ไฟล์นี้เท่านั้น ไม่ต้องไล่แก้ตาม component

องค์ประกอบเด่น: `components/dashboard/liquid-gauge.tsx` — หลอดแก้วแสดงระดับน้ำแบบมีคลื่นเคลื่อนไหว
เปลี่ยนสีตามสถานะ (ปกติ/เฝ้าระวัง/อันตราย) โดยอัตโนมัติ

## ตำแหน่งผู้ใช้ (geolocation)

1. ขอสิทธิ์ GPS จากเบราว์เซอร์ก่อนเสมอ
2. ถ้าปฏิเสธ/ไม่รองรับ → เรียก `/api/geo` (server-side) เพื่อประมาณตำแหน่งจาก IP (ipapi.co → ip-api.com
   เป็น fallback) และ**แจ้ง user ชัดเจนว่าความแม่นยำต่ำกว่า GPS**
3. เทียบระยะทาง (haversine) กับ sensor ทุกตัว แล้วเลือกตัวที่ใกล้ที่สุดเป็นค่าเริ่มต้น
4. Resolve ใหม่ทุกครั้งที่เข้าเว็บ (ไม่ cache ข้ามเซสชัน) — ปรับได้ที่ `SITE_CONFIG.geolocation.cacheAcrossSessions`

ผู้ใช้ยังสามารถเลือก sensor เองได้จาก dropdown หรือคลิกบนแผนที่ ซึ่งจะ override ค่าอัตโนมัติจนกว่าจะรีเฟรชหน้า

## ระบบสมาชิกและชุมชน (Phase 2)

- **สมัคร/ล็อกอิน**: Supabase Auth email+password พร้อม flow ยืนยันอีเมล ข้อจำกัดโดเมนอีเมลตั้งค่าได้ผ่าน
  `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` (ว่าง = เปิดรับทุกอีเมล)
- **แชทชุมชน**: realtime, ตอบกลับข้อความ (reply), reaction (emoji), กันสแปมด้วย **DB trigger** (ไม่ใช่แค่ฝั่ง client)
  จำกัดคนละ 1 ข้อความต่อ 3 วินาที (`check_message_rate_limit()` ใน `002_phase2_community.sql`)
- **แจ้งเหตุน้ำท่วม**: ต้องล็อกอิน, ผ่าน `/api/flood-reports` ซึ่งตรวจ Cloudflare Turnstile token ฝั่ง server ก่อน insert
  เสมอ (ถ้าไม่ได้ตั้งค่า Turnstile key ระบบจะข้ามการตรวจอัตโนมัติ ไม่บล็อกผู้ใช้)
- **โหวตสภาพอากาศ**: ไม่ต้องล็อกอินก็โหวตได้ (ผูกกับ `visitor_id` ที่เก็บใน localStorage) กันโหวตซ้ำถี่ ๆ
  ทั้งฝั่ง client (UX) และฝั่ง server (`/api/weather/vote` บังคับจริง)
- **ประกาศ**: อ่านได้ทุกคน realtime, การจัดการ (สร้าง/ปิด) จะอยู่ในหน้า Developer Settings ตอน Phase 4

### Cloudflare Turnstile

ยังไม่ได้ตั้ง key ก็ใช้งานได้ปกติ — ทุกฟอร์มที่เกี่ยวข้อง (สมัครสมาชิก, แจ้งเหตุน้ำท่วม) จะตรวจสอบว่ามี site key
หรือไม่ตอน mount ถ้าไม่มีจะข้ามการ์ดป้องกันบอทไปเลย พอมี key จริงแค่ใส่ `.env.local` (`CLOUDFLARE_TURNSTILE_SITE_KEY`,
`CLOUDFLARE_TURNSTILE_SECRET_KEY`) ระบบจะเปิดใช้งานเองโดยไม่ต้องแก้โค้ด

## ผู้ช่วย AI (Phase 3)

- ปุ่มลอย (มุมขวาล่าง) เปิดแชทกับ AI ที่รู้ context ของ sensor ที่เลือกอยู่ (ระดับน้ำ, เกณฑ์เตือนภัย, แนวโน้ม, สภาพอากาศ)
- วิเคราะห์สถานการณ์อัตโนมัติทุกครั้งที่ระดับน้ำเปลี่ยนแปลงมาก หรือทุก 5 นาที (ปรับได้ที่ `NEXT_PUBLIC_AI_ANALYSIS_INTERVAL_MS`)
- เรียก tool ได้เอง 8 อัน (ดูข้อมูล sensor ล่าสุด/ย้อนหลัง, สภาพอากาศ, ประกาศเตือนภัย TMD, รายงานน้ำท่วมชุมชน,
  พื้นที่เสี่ยง, ค่าตั้งไซต์, ค้นหาเว็บ) — ไม่เดาข้อมูลเอง ต้องดึงจริงเสมอ (`lib/ai/tools/tool-registry.ts`)
- รองรับ 2 provider: Gemini (ค่าเริ่มต้น) หรือ LM Studio (local model) — สลับด้วย `AI_PROVIDER`
- Stream คำตอบแบบ SSE พร้อมโชว์สถานะตอนกำลังเรียก tool อยู่ (เช่น "🔧 กำลังตรวจสอบสภาพอากาศ...")

### Web search — Tavily แทน DuckDuckGo

`search_web` เดิมใช้ DuckDuckGo Instant Answer API ซึ่งคืนแค่ abstract สั้น ๆ ไม่ใช่ผลค้นหาเว็บจริง —
เปลี่ยนมาใช้ **Tavily** แทน (ออกแบบมาสำหรับ AI agent โดยเฉพาะ คืนเนื้อหาเพจจริงที่สกัดมาแล้วพร้อมคำตอบสรุป)
ฟรี 1,000 ครั้ง/เดือน ไม่ต้องใช้บัตรเครดิต สมัครที่ [app.tavily.com](https://app.tavily.com) แล้วใส่
`TAVILY_API_KEY` ใน `.env.local` — ถ้าไม่ใส่ ระบบจะ fallback ไป DuckDuckGo อัตโนมัติ (ไม่ error แต่คุณภาพต่ำกว่ามาก)

## Notification center + Developer settings (Phase 4)

- **`/notifications`**: ดูสถานะทุก sensor พร้อมกัน (ไม่ใช่แค่ตัวที่เลือกอยู่บน dashboard), เปิดการแจ้งเตือนเบราว์เซอร์
  (Web Notification API) ซึ่งจะเด้งแจ้งอัตโนมัติเมื่อ sensor ไหนขึ้นระดับเฝ้าระวัง/อันตราย (ทำงานอยู่เบื้องหลังทุกหน้า
  ไม่ใช่แค่ตอนเปิดหน้า notifications — ดู `hooks/use-browser-notifications.tsx`), และประวัติประกาศทั้งหมด
- **`/dev-settings`**: จัดการ sensor (เพิ่ม/แก้ไข/ปิดใช้งาน/ลบ), พื้นที่เสี่ยง, ประกาศ — ทั้งหมดผ่าน UI แทนการรัน SQL
  **ไม่ต้องเพิ่มตารางหรือ SQL ใหม่เลย** เพราะ policy `"Devs can manage ..."` มีอยู่แล้วตั้งแต่ 001/002 — หน้านี้เป็นแค่
  UI ที่เรียกใช้สิทธิ์ที่มีอยู่แล้ว การ์ดที่หน้าเว็บ (`RequireDev`) กันไม่ให้ user ทั่วไปเห็นเมนู แต่ตัวจริงที่บังคับสิทธิ์คือ RLS
  ฝั่ง Supabase (ต่อให้ bypass UI ไปเรียก API ตรงๆ ก็เขียนไม่ได้ถ้า role ไม่ใช่ `dev`)

ตอนนี้ครบทุกฟีเจอร์ตามที่ระบุไว้ในเอกสารเริ่มต้นแล้ว (ระดับน้ำเรียลไทม์, สภาพอากาศ, ชุมชน, AI, แผนที่, แจ้งเตือน, ธีม/ภาษา,
developer settings) — โครงสร้างยังออกแบบให้ต่อยอดเพิ่มได้เสมอ (เพิ่มตาราง/route/component ใหม่โดยไม่กระทบของเดิม)

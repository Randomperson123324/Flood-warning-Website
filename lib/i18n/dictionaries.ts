export const locales = ["th", "en"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "th"

// Flat key → { th, en } so adding a new UI string never requires touching
// more than one place. Group by feature area as the app grows (Phase 2+
// features append their own sections here — don't split into per-feature
// files until this genuinely gets unwieldy).
export const dictionary = {
  app: {
    name: { th: "StreeFlood", en: "StreeFlood" },
    tagline: {
      th: "ระบบเฝ้าระวังน้ำท่วมและสภาพอากาศแบบเรียลไทม์",
      en: "Real-time flood & weather monitoring",
    },
  },
  nav: {
    dashboard: { th: "แดชบอร์ด", en: "Dashboard" },
    map: { th: "แผนที่", en: "Map" },
    weather: { th: "สภาพอากาศ", en: "Weather" },
    community: { th: "ชุมชน", en: "Community" },
    notifications: { th: "การแจ้งเตือน", en: "Notifications" },
    login: { th: "เข้าสู่ระบบ", en: "Log in" },
    menu: { th: "เมนู", en: "Menu" },
    devSettings: { th: "ตั้งค่านักพัฒนา", en: "Dev Settings" },
  },
  location: {
    resolving: { th: "กำลังค้นหาตำแหน่งของคุณ...", en: "Finding your location..." },
    gpsGranted: { th: "ใช้ตำแหน่ง GPS ของคุณ", en: "Using your GPS location" },
    ipFallback: {
      th: "ไม่ได้รับอนุญาตให้เข้าถึง GPS — ใช้ตำแหน่งโดยประมาณจาก IP แทน (แม่นยำน้อยกว่า GPS)",
      en: "GPS access denied — using an approximate IP-based location instead (less accurate than GPS)",
    },
    fallbackDefault: {
      th: "ไม่สามารถหาตำแหน่งได้ — แสดงจุดวัดเริ่มต้น",
      en: "Couldn't determine your location — showing the default sensor",
    },
    nearestSensor: { th: "จุดวัดใกล้คุณที่สุด", en: "Nearest sensor to you" },
    enableGps: { th: "เปิดสิทธิ์ GPS เพื่อความแม่นยำ", en: "Enable GPS for better accuracy" },
    retry: { th: "ลองอีกครั้ง", en: "Retry" },
  },
  status: {
    normal: { th: "ปกติ", en: "Normal" },
    warning: { th: "เฝ้าระวัง", en: "Warning" },
    danger: { th: "อันตราย", en: "Danger" },
    rising: { th: "กำลังสูงขึ้น", en: "Rising" },
    falling: { th: "กำลังลดลง", en: "Falling" },
    stable: { th: "คงที่", en: "Stable" },
    currentLevel: { th: "ระดับน้ำปัจจุบัน", en: "Current water level" },
    lastUpdated: { th: "อัปเดตล่าสุด", en: "Last updated" },
    timeToWarning: { th: "เวลาที่จะถึงระดับเฝ้าระวัง", en: "Time to warning level" },
    timeToDanger: { th: "เวลาที่จะถึงระดับอันตราย", en: "Time to danger level" },
    ratePerHour: { th: "อัตราการเปลี่ยนแปลง", en: "Rate of change" },
    noData: { th: "ยังไม่มีข้อมูลจากเซ็นเซอร์นี้", en: "No data from this sensor yet" },
  },
  sensor: {
    select: { th: "เลือกจุดวัด", en: "Select sensor" },
    default: { th: "ค่าเริ่มต้น", en: "Default" },
  },
  chart: {
    title: { th: "แนวโน้มระดับน้ำย้อนหลัง", en: "Water level history" },
    hours24: { th: "24 ชม.", en: "24h" },
    days7: { th: "7 วัน", en: "7d" },
  },
  weather: {
    title: { th: "สภาพอากาศ", en: "Weather" },
    humidity: { th: "ความชื้น", en: "Humidity" },
    wind: { th: "ลม", en: "Wind" },
    rainLastHour: { th: "ฝนใน 1 ชม.ที่ผ่านมา", en: "Rain (last 1h)" },
    source: { th: "แหล่งข้อมูล", en: "Source" },
  },
  map: {
    title: { th: "แผนที่จุดวัดน้ำ", en: "Sensor map" },
    you: { th: "ตำแหน่งของคุณ", en: "Your location" },
  },
  theme: {
    light: { th: "สว่าง", en: "Light" },
    dark: { th: "มืด", en: "Dark" },
    system: { th: "ตามระบบ", en: "System" },
  },
  common: {
    loading: { th: "กำลังโหลด...", en: "Loading..." },
    error: { th: "เกิดข้อผิดพลาด", en: "Something went wrong" },
    retry: { th: "ลองใหม่", en: "Retry" },
    km: { th: "กม.", en: "km" },
  },
  community: {
    title: { th: "ชุมชน", en: "Community" },
    chatTab: { th: "แชท", en: "Chat" },
    reportsTab: { th: "รายงานน้ำท่วม", en: "Flood reports" },
    placeholder: { th: "พิมพ์ข้อความ...", en: "Type a message..." },
    send: { th: "ส่ง", en: "Send" },
    replyingTo: { th: "ตอบกลับ", en: "Replying to" },
    cancelReply: { th: "ยกเลิก", en: "Cancel" },
    loginToChat: { th: "เข้าสู่ระบบเพื่อพูดคุยกับชุมชน", en: "Log in to join the conversation" },
    rateLimited: { th: "ส่งข้อความเร็วเกินไป รอสักครู่นะ", en: "Sending too fast — please wait a moment" },
    empty: { th: "ยังไม่มีข้อความ เริ่มพูดคุยได้เลย", en: "No messages yet — start the conversation" },
    online: { th: "ออนไลน์", en: "online" },
  },
  reports: {
    title: { th: "แจ้งเหตุน้ำท่วม", en: "Report flooding" },
    submit: { th: "ส่งรายงาน", en: "Submit report" },
    area: { th: "พื้นที่ที่ได้รับผลกระทบ", en: "Affected area" },
    severity: { th: "ระดับความรุนแรง", en: "Severity" },
    description: { th: "รายละเอียด", en: "Description" },
    severityLow: { th: "น้อย", en: "Low" },
    severityModerate: { th: "ปานกลาง", en: "Moderate" },
    severityHigh: { th: "สูง", en: "High" },
    severityCritical: { th: "วิกฤต", en: "Critical" },
    submitted: { th: "ส่งรายงานเรียบร้อยแล้ว ขอบคุณครับ", en: "Report submitted — thank you" },
    loginRequired: { th: "เข้าสู่ระบบก่อนส่งรายงาน", en: "Log in to submit a report" },
    submitting: { th: "กำลังส่ง...", en: "Submitting..." },
    empty: { th: "ยังไม่มีรายงานน้ำท่วม", en: "No flood reports yet" },
    anonymous: { th: "ผู้ใช้", en: "User" },
  },
  weatherVote: {
    question: { th: "ตอนนี้ฝนตกไหม?", en: "Is it raining right now?" },
    yes: { th: "ฝนตก", en: "Raining" },
    no: { th: "ไม่ตก", en: "Not raining" },
    thanks: { th: "ขอบคุณสำหรับการโหวต!", en: "Thanks for voting!" },
    alreadyVoted: { th: "คุณโหวตไปแล้วเมื่อสักครู่", en: "You already voted recently" },
    resultsRaining: { th: "รายงานว�����าฝนตก", en: "reported raining" },
  },
  announcements: {
    title: { th: "ประกาศ", en: "Announcements" },
  },
  tmdWarning: {
    badge: { th: "ประกาศเตือนภัยจากกรมอุตุนิยมวิทยา", en: "TMD Weather Warning" },
    seeMore: { th: "ดูเพิ่มเติม", en: "See more" },
    seeLess: { th: "ย่อ", en: "See less" },
    goToTmd: { th: "ไปที่กรมอุตุฯ", en: "Go to TMD" },
    advisoryDoc: { th: "ดูเอกสารประกาศ", en: "See advisory doc" },
  },
  notifications: {
    title: { th: "การแจ้งเตือน", en: "Notifications" },
    sensorStatus: { th: "สถานะจุดวัดทั้งหมด", en: "All sensor status" },
    enableBrowser: { th: "เปิดการแจ้งเตือนเบราว์เซอร์", en: "Enable browser notifications" },
    browserEnabled: { th: "เปิดใช้งานแล้ว — จะแจ้งเตือนเมื่อระดับน้ำเข้าสู่ระดับเฝ้าระวัง/อันตราย", en: "Enabled — you'll be notified when a sensor reaches warning/danger" },
    browserDenied: { th: "เบราว์เซอร์ปฏิเสธการแจ้งเตือน — เปิดได้ในตั้งค่าเบราว์เซอร์", en: "Browser denied notifications — enable it in your browser settings" },
    browserUnsupported: { th: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน", en: "This browser doesn't support notifications" },
    noAlerts: { th: "ทุกจุดวัดอยู่ในระดับปกติ", en: "All sensors are at normal levels" },
    noAnnouncements: { th: "ยังไม่มีประกาศ", en: "No announcements yet" },
  },
  devSettings: {
    title: { th: "ตั้งค่าสำหรับผู้ดูแล", en: "Developer Settings" },
    accessDenied: { th: "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น", en: "This page is for administrators only" },
    sensorsTab: { th: "จุดวัดน้ำ", en: "Sensors" },
    areasTab: { th: "พื้นที่เสี่ยง", en: "Affected areas" },
    announcementsTab: { th: "ประกาศ", en: "Announcements" },
    add: { th: "เพิ่ม", en: "Add" },
    edit: { th: "แก้ไข", en: "Edit" },
    save: { th: "บันทึก", en: "Save" },
    cancel: { th: "ยกเลิก", en: "Cancel" },
    delete: { th: "ลบ", en: "Delete" },
    deactivate: { th: "ปิดใช้งาน", en: "Deactivate" },
    activate: { th: "เปิดใช้งาน", en: "Activate" },
    confirmDelete: { th: "ยืนยันการลบ?", en: "Confirm delete?" },
    label: { th: "ชื่อจุดวัด", en: "Label" },
    sensorId: { th: "รหัสเซ็นเซอร์", en: "Sensor ID" },
    lat: { th: "ละติจูด", en: "Latitude" },
    lon: { th: "ลองจิจูด", en: "Longitude" },
    heightCm: { th: "ความสูงจากพื้น (ซม.)", en: "Height (cm)" },
    warningLevel: { th: "ระดับเฝ้าระวัง (ซม.)", en: "Warning level (cm)" },
    dangerLevel: { th: "ระดับอันตราย (ซม.)", en: "Danger level (cm)" },
    isDefault: { th: "เป็นค่าเริ่มต้น", en: "Default sensor" },
    areaName: { th: "ชื่อพื้นที่", en: "Area name" },
    threshold: { th: "ระดับน้ำที่กระทบ (ซม.)", en: "Impact threshold (cm)" },
    description: { th: "รายละเอียด", en: "Description" },
    message: { th: "ข้อความประกาศ", en: "Announcement message" },
    type: { th: "รูปแบบการแสดง", en: "Display type" },
    typeBanner: { th: "แบนเนอร์", en: "Banner" },
    typePopup: { th: "ป๊อปอัพ", en: "Popup" },
    popupTitle: { th: "ประกาศ", en: "Announcement" },
    popupClose: { th: "ปิด", en: "Close" },
    saved: { th: "บันทึกแล้ว", en: "Saved" },
    noItems: { th: "ยังไม่มีข้อมูล", en: "Nothing here yet" },
  },
  ai: {
    title: { th: "ผู้ช่วย AI", en: "AI Assistant" },
    disclaimer: { th: "สนทนานี้ไม่ถูกบันทึก", en: "This conversation isn't saved" },
    autoAnalysis: { th: "การวิเคราะห์อัตโนมัติ", en: "Auto-analysis" },
    waitingForData: { th: "รอข้อมูล...", en: "Waiting for data..." },
    placeholder: { th: "ถามเกี่ยวกับสถานการณ์น้ำ...", en: "Ask about the water situation..." },
    clear: { th: "ล้างประวัติ", en: "Clear history" },
  },
} as const

type Dictionary = typeof dictionary
type SectionKey = keyof Dictionary
type EntryKey<S extends SectionKey> = keyof Dictionary[S]

/** `t("status", "currentLevel")` → localized string for the active locale. */
export function translate<S extends SectionKey>(locale: Locale, section: S, key: EntryKey<S>): string {
  const entry = dictionary[section][key] as { th: string; en: string }
  return entry[locale]
}

"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, Droplets, Bell, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Meteors } from "@/components/ui/meteors"
import { Globe } from "@/components/ui/globe"
import Text3DFlip from "@/components/ui/text-3d-flip"

// ── Language cycling data ────────────────────────────────────────────────────
const HELLO_LANGS = ["สวัสดี", "Hello", "你好"]
const SCROLL_LANGS = ["เลื่อนลง ↓", "Scroll Down ↓", "向下滚动 ↓"]

// ── Scroll hint with fade ────────────────────────────────────────────────────
function ScrollHint() {
  const [idx, setIdx] = useState(0)
  const [vis, setVis] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVis(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % SCROLL_LANGS.length)
        setVis(true)
      }, 500)
    }, 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <p
      className="mt-10 text-xs uppercase tracking-widest text-red-300/60"
      style={{ transition: "opacity 0.5s ease", opacity: vis ? 1 : 0 }}
    >
      {SCROLL_LANGS[idx]}
    </p>
  )
}

// ── Pill icon placeholder ────────────────────────────────────────────────────
function PillIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-full rounded-br-none border-2 border-red-500 bg-gradient-to-br from-red-500/20 to-transparent flex items-center justify-center shadow-lg shadow-red-500/20">
      {children}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  // Loading state
  const [fillPct, setFillPct] = useState(0)
  const [expanding, setExpanding] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Cycling Hello word for Text3DFlip
  const [helloIdx, setHelloIdx] = useState(0)

  // Loading liquid fill
  useEffect(() => {
    let pct = 0
    const iv = setInterval(() => {
      pct += 1.4
      setFillPct(Math.min(pct, 100))
      if (pct >= 100) {
        clearInterval(iv)
        setTimeout(() => setExpanding(true), 300)
        setTimeout(() => setShowContent(true), 1100)
      }
    }, 25)
    return () => clearInterval(iv)
  }, [])

  // Cycle hello languages every 4s once content is visible
  useEffect(() => {
    if (!showContent) return
    const t = setInterval(() => {
      setHelloIdx((i) => (i + 1) % HELLO_LANGS.length)
    }, 4000)
    return () => clearInterval(t)
  }, [showContent])

  const sections = [
    {
      icon: <Droplets className="w-5 h-5 text-red-400" />,
      title: "StreeFlood Project",
      sub: "โครงการ StreeFlood",
      body: "โครงงานระบบติดตามระดับน้ำเฝ้าระวังและเตือนหากระดับน้ำอันตราย พัฒนาโดยนักเรียนโรงเรียนสตรีประเสริฐศิลป์ 3 คน ม.2/2 SMTE กลุ่มหมูแดดเดียว",
    },
    {
      icon: <Bell className="w-5 h-5 text-red-400" />,
      title: "Our Mission",
      sub: "พันธกิจของเรา",
      body: "พัฒนาระบบแจ้งเตือนภัยที่มีความแม่นยำและรวดเร็ว · จัดเก็บประวัติระดับน้ำได้อย่างมีประสิทธิภาพ · สามารถใช้งานได้จริง ไม่ล่มบ่อย ไม่เอ๋อ",
    },
    {
      icon: <Shield className="w-5 h-5 text-red-400" />,
      title: "Credits & Contact",
      sub: "เครดิต & ติดต่อ",
      body: "รูปภาพในหน้านี้นำมากจาก แนวหน้า · ติดต่อผ่าน Google Form โปรดใช้อีเมลโรงเรียนในการติดต่อ",
    },
  ]

  return (
    <>
      <style>{`
        @keyframes waveAnim {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(40px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
      `}</style>

      {/* ── LOADING SCREEN ───────────────────────────────────────────────── */}
      {!showContent && (
        <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
          <Meteors number={25} />

          {/* The pill shape that expands */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: "2px solid #ef4444",
              boxShadow: "0 0 60px rgba(239,68,68,0.4), inset 0 0 30px rgba(239,68,68,0.05)",
              transition: expanding
                ? "width 0.85s cubic-bezier(0.4,0,0.2,1), height 0.85s cubic-bezier(0.4,0,0.2,1), border-radius 0.85s ease, border 0.85s ease"
                : "none",
              width: expanding ? "100vw" : "140px",
              height: expanding ? "100vh" : "140px",
              borderRadius: expanding ? "0px" : "9999px 9999px 9999px 0px",
            }}
          >
            {/* Liquid fill */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `${fillPct}%`,
                transition: "height 0.03s linear",
                background: "rgba(185,28,28,0.9)",
                overflow: "hidden",
              }}
            >
              {/* Wave on top of liquid */}
              <svg
                viewBox="0 0 800 40"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  top: -20,
                  left: 0,
                  width: "200%",
                  height: "30px",
                  animation: "waveAnim 1.6s linear infinite",
                }}
              >
                <path
                  d="M0,20 C100,38 200,2 400,20 C600,38 700,2 800,20 L800,40 L0,40 Z"
                  fill="rgba(239,68,68,0.8)"
                />
                <path
                  d="M0,26 C150,42 250,10 400,26 C550,42 650,10 800,26 L800,40 L0,40 Z"
                  fill="rgba(220,38,38,0.6)"
                />
              </svg>
            </div>

            {/* Percent */}
            {!expanding && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <span style={{ color: "white", fontWeight: 700, fontSize: "1.3rem" }}>
                  {Math.round(fillPct)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      {showContent && (
        <div className="min-h-screen bg-gray-950 text-white font-sao-chingcha">

          {/* ── HERO SECTION ────────────────────────────────────────────── */}
          <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
            <Meteors number={20} />

            {/* Ambient glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[600px] bg-red-600/8 rounded-full blur-[120px]" />
            </div>

            {/* Back button */}
            <div className="absolute top-6 left-6 z-20">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="text-red-300 hover:text-white hover:bg-red-500/20 border border-red-500/30 rounded-full rounded-br-none"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            </div>

            <div className="flex flex-col items-center gap-4 z-10 px-4 text-center">
              {/* Brand pill */}
              <div className="w-20 h-20 rounded-full rounded-br-none border-2 border-red-500 bg-gradient-to-br from-red-600/25 to-transparent flex items-center justify-center shadow-2xl shadow-red-500/30 mb-4">
                <Droplets className="w-8 h-8 text-red-400" />
              </div>

              {/* Text3DFlip — remount on each language change to replay animation */}
              <div
                className="text-[5rem] sm:text-[7rem] md:text-[9rem] font-bold leading-none tracking-tight"
                style={{ minHeight: "1.1em" }}
              >
                <Text3DFlip
                  key={helloIdx}
                  className="text-white font-bold"
                  textClassName="text-white"
                  flipTextClassName="text-red-400"
                  rotateDirection="top"
                  staggerDuration={0.04}
                  staggerFrom="first"
                >
                  {HELLO_LANGS[helloIdx]}
                </Text3DFlip>
              </div>

              <p className="text-red-400/50 text-sm tracking-[0.25em] uppercase mt-2">
                StreeFlood — Flood Monitoring System
              </p>

              <ScrollHint />
            </div>
          </section>

          {/* ── CONTENT SECTION ─────────────────────────────────────────── */}
          <section className="relative py-24 px-6 max-w-2xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">About Us</h2>
              <div className="mt-3 w-14 h-1 bg-red-500 mx-auto rounded-full" />
            </div>

            <div className="space-y-5">
              {sections.map((s, i) => (
                <div
                  key={s.title}
                  className="fade-up flex gap-5 p-6 rounded-2xl rounded-br-none border border-red-500/15 bg-white/[0.03] backdrop-blur hover:border-red-500/40 hover:bg-white/[0.06] transition-all duration-300"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <PillIcon>{s.icon}</PillIcon>
                  <div>
                    <p className="text-[10px] text-red-400/60 uppercase tracking-[0.2em] mb-0.5">
                      {s.sub}
                    </p>
                    <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed font-noto-sans-thai">
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <a
                href="https://forms.gle/1Te39d2yoXZYDfNr5"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full rounded-br-none border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 text-sm font-medium"
              >
                Contact Us via Google Form
              </a>
              <p className="mt-2 text-xs text-gray-600">โปรดใช้อีเมลโรงเรียนในการติดต่อ</p>
            </div>
          </section>

          {/* ── GLOBE SECTION ────────────────────────────────────────────── */}
          <section className="relative py-24 px-6 flex flex-col items-center overflow-hidden">
            <Meteors number={10} />

    <div className="bg-background relative flex size-full max-w-lg items-center justify-center overflow-hidden rounded-lg border px-40 pt-8 pb-40 md:pb-60">
      <span className="pointer-events-none bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10">
        Globe
      </span>
      <Globe className="top-28" />
      <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
    </div>


            <div className="z-10 text-center mt-4 space-y-2">
              <p className="text-2xl font-bold text-white">
                Accessible no matter where you are
              </p>
            </div>
          </section>

          {/* ── FOOTER ───────────────────────────────────────────────────── */}
          <div className="pb-12 text-center">
            <p className="text-sm text-gray-700 mb-6">Made with ❤️ Team หมูแดดเดียว</p>
            <Footer />
          </div>
        </div>
      )}
    </>
  )
}

"use client"

import { ChevronDown, Database, Monitor, Bell, MessageCircle, Users, AlertTriangle, ExternalLink, MoveUpRight } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { useEffect, useState, useRef } from "react"
import Image from "next/image"

export default function AboutPage() {
    const [showGradient, setShowGradient] = useState(false)
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [pageReady, setPageReady] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const timer = setTimeout(() => setShowGradient(true), 500)
        return () => clearTimeout(timer)
    }, [])

    // Handle video load and page readiness
    useEffect(() => {
        const video = videoRef.current
        if (!video) {
            // If video element doesn't exist (e.g., file missing), skip loading
            setVideoLoaded(true)
            setPageReady(true)
            return
        }

        const handleCanPlay = () => {
            setVideoLoaded(true)
            setTimeout(() => setPageReady(true), 300)
        }

        // If video is already loaded (cached)
        if (video.readyState >= 3) {
            handleCanPlay()
        } else {
            video.addEventListener('canplaythrough', handleCanPlay)
        }

        // Fallback: show page after 5s even if video hasn't loaded
        const fallback = setTimeout(() => {
            setVideoLoaded(true)
            setPageReady(true)
        }, 5000)

        return () => {
            video.removeEventListener('canplaythrough', handleCanPlay)
            clearTimeout(fallback)
        }
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 font-sao-chingcha">
            {/* Loading Screen */}
            <div className={`fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center transition-all duration-700 ${pageReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}>
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
                </div>
                <p className="text-white text-lg font-medium animate-pulse">กำลังโหลด...</p>
                <p className="text-gray-400 text-sm mt-2">Loading video content</p>
            </div>

            {/* Hidden video preloader */}
            <video
                ref={videoRef}
                src="/video/rain.mp4"
                muted
                playsInline
                preload="auto"
                className="hidden"
            />
            {/* Hero Section - Full Screen */}
            <section className="relative w-full h-screen flex items-end justify-center overflow-hidden">
                {/* Background Image */}
                <img
                    src="/images/about-banner.jpg"
                    alt="About Hero"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Animated Blur Gradient Overlay from Bottom - Fixed 40vh coverage */}
                <div
                    className={`absolute bottom-0 left-0 right-0 h-[40vh] bg-white/5 backdrop-blur-2xl transition-all duration-1000 ease-out ${showGradient ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
                    style={{
                        maskImage: 'linear-gradient(to top, black 70%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent 100%)'
                    }}
                />

                {/* Blur Header with Navigation */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4">
                    <div className="flex justify-end gap-3">
                        <Link href="/">
                            <button className="group flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 font-medium text-sm transition-all duration-300 hover:bg-white hover:text-gray-900 hover:scale-105 hover:shadow-lg">
                                <span>ไปที่เว็บไซต์</span>
                                <div className="overflow-hidden">
                                    <MoveUpRight className="w-4 h-4 animate-move-up-right" />
                                </div>
                            </button>
                        </Link>
                        <a
                            href="https://forms.gle/1Te39d2yoXZYDfNr5"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <button className="group flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 font-medium text-sm transition-all duration-300 hover:bg-white hover:text-gray-900 hover:scale-105 hover:shadow-lg">
                                <span>ติดต่อเรา</span>
                                <div className="overflow-hidden">
                                    <MoveUpRight className="w-4 h-4 animate-move-up-right" />
                                </div>
                            </button>
                        </a>
                    </div>
                </div>

                {/* Hero Content - positioned at bottom within gradient */}
                <div className={`relative z-10 pb-12 text-center transition-all duration-1000 delay-300 ${showGradient ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
                    <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-2 drop-shadow-lg">
                        About Us
                    </h1>
                    <p className="text-lg text-gray-700 mb-6">เกี่ยวกับเรา</p>

                    {/* Scroll Down Indicator - Capsule Style */}
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-900/80 text-white rounded-full animate-bounce">
                        <span className="text-sm font-medium">Scroll Down</span>
                        <ChevronDown className="h-4 w-4" />
                    </div>
                </div>
            </section>

            {/* Quote Section - Full Screen Video */}
            <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
                {/* Video Background */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src="/videos/rain2.mp4" type="video/mp4" />
                </video>

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/50" />

                {/* Quote Content */}
                <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-playfair italic text-white mb-10 leading-tight drop-shadow-2xl">
                        “Nothing is softer or more flexible than water, yet nothing can resist it.”
                    </h2>
                    <p className="text-xl md:text-3xl text-gray-200 font-playfair font-medium tracking-wide">
                        — Lao Tzu (chinese philosopher)
                    </p>
                </div>

                {/* Scroll Down Indicator */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                    <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
                    <ChevronDown className="h-6 w-6 text-white/70 animate-bounce" />
                </div>
            </section>

            {/* Content Section - 4 Parts with Folder Tab Design */}
            <section className="bg-white dark:bg-gray-900 py-16 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="font-noto-sans-thai">
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .tab-mask {
                                --svg-left: url("data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.3995 24.8356L27.0306 9.12812C28.9935 3.6528 34.1835 0 40 0V40H0V39.897C9.59729 39.897 18.1607 33.8699 21.3995 24.8356Z' fill='black'/%3E%3C/svg%3E");
                                --svg-right: url("data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18.6005 24.8356L12.9694 9.12812C11.0065 3.6528 5.81654 0 0 0V40H40V39.897C30.4027 39.897 21.8393 33.8699 18.6005 24.8356Z' fill='black'/%3E%3C/svg%3E");
                                --svg-center: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='black'/%3E%3C/svg%3E");
                                
                                mask-image: var(--svg-left), var(--svg-center), var(--svg-right);
                                -webkit-mask-image: var(--svg-left), var(--svg-center), var(--svg-right);
                                
                                mask-position: left bottom, center bottom, right bottom;
                                -webkit-mask-position: left bottom, center bottom, right bottom;
                                
                                mask-repeat: no-repeat;
                                -webkit-mask-repeat: no-repeat;
                            }
                            
                            .tab-mask-mobile {
                                mask-size: 40px 100%, calc(100% - 72px) 100%, 40px 100%;
                                -webkit-mask-size: 40px 100%, calc(100% - 72px) 100%, 40px 100%;
                            }
                            
                            @media (min-width: 768px) {
                                .tab-mask-mobile {
                                    mask-size: 56px 100%, calc(100% - 104px) 100%, 56px 100%;
                                    -webkit-mask-size: 56px 100%, calc(100% - 104px) 100%, 56px 100%;
                                }
                            }

                            @keyframes move-up-right-loop {
                                0% { transform: translate(0, 0); opacity: 1; }
                                35% { transform: translate(100%, -100%); opacity: 0; }
                                36% { transform: translate(-100%, 100%); opacity: 1; }
                                100% { transform: translate(0, 0); opacity: 1; }
                            }
                            
                            .group:hover .animate-move-up-right {
                                animation: move-up-right-loop 0.5s ease-in-out forwards;
                            }
                        ` }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
                            {/* StreetFlood Project Card */}
                            <div className="relative mt-12 group">
                                {/* Protruding Tab (Fluid Curves with SVG) */}
                                <div className="absolute bottom-[calc(100%-1px)] left-8 z-20 flex items-center h-[40px] md:h-[48px] tab-mask tab-mask-mobile px-10 md:px-14 overflow-hidden">
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20 dark:bg-black/40 backdrop-blur-md z-0" />

                                    <img src="https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=800&auto=format&fit=crop" alt="Tab BG" className="absolute top-0 left-0 w-[400px] h-[200px] object-cover blur-xl scale-125 opacity-90 z-0" />
                                    <div className="absolute inset-0 bg-black/10 dark:bg-black/40 z-0" />

                                    <h3 className="relative z-10 text-base md:text-lg font-bold text-white whitespace-nowrap">StreetFlood Project</h3>
                                </div>

                                <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-gray-700/50 min-h-[260px] flex flex-col">
                                    {/* Background Image */}
                                    <img
                                        src="https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=800&auto=format&fit=crop"
                                        alt="StreetFlood"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-0"
                                    />

                                    {/* Gradient Blur Overlay without white color */}
                                    <div
                                        className="absolute inset-0 w-[95%] sm:w-[85%] bg-black/10 dark:bg-black/40 z-0"
                                        style={{
                                            backdropFilter: 'blur(16px)',
                                            WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
                                            maskImage: 'linear-gradient(to right, black 65%, transparent 100%)'
                                        }}
                                    />

                                    {/* Content */}
                                    <div className="relative z-10 pt-12 px-8 pb-8 w-[85%] sm:w-[70%] flex-grow flex flex-col justify-center">
                                        <p className="text-white font-medium text-sm leading-relaxed mb-4">
                                            โครงงานระบบติดตามระดับน้ำเฝ้าระวังและเตือนหากระดับน้ำอันตราย
                                            พัฒนาโดยนักเรียน ม.2/2 SMTE กลุ่มหมูแดดเดียว
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Our Mission Card */}
                            <div className="relative mt-12 group">
                                <div className="absolute bottom-[calc(100%-1px)] left-8 z-20 flex items-center h-[40px] md:h-[48px] tab-mask tab-mask-mobile px-10 md:px-14 overflow-hidden">
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20 dark:bg-black/40 backdrop-blur-md z-0" />
                                    <img src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800&auto=format&fit=crop" alt="Tab BG" className="absolute top-0 left-0 w-[400px] h-[200px] object-cover blur-xl scale-125 opacity-90 z-0" />
                                    <div className="absolute inset-0 bg-black/10 dark:bg-black/40 z-0" />
                                    <h3 className="relative z-10 text-base md:text-lg font-bold text-white whitespace-nowrap">Our Mission</h3>
                                </div>

                                <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-gray-700/50 min-h-[260px] flex flex-col">
                                    <img
                                        src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800&auto=format&fit=crop"
                                        alt="Mission"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-0"
                                    />
                                    <div
                                        className="absolute inset-0 w-[95%] sm:w-[85%] bg-black/10 dark:bg-black/40 z-0"
                                        style={{
                                            backdropFilter: 'blur(16px)',
                                            WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
                                            maskImage: 'linear-gradient(to right, black 65%, transparent 100%)'
                                        }}
                                    />

                                    <div className="relative z-10 pt-12 px-8 pb-8 w-[85%] sm:w-[70%] flex-grow flex flex-col justify-center">
                                        <ul className="text-white font-medium text-sm space-y-2">
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                                                พัฒนาระบบแจ้งเตือนภัยที่แม่นยำและรวดเร็ว
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                                                จัดเก็บประวัติระดับน้ำได้อย่างมีประสิทธิภาพ
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                                                สามารถใช้งานได้จริง ไม่ล่มบ่อย
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Credits Card */}
                            <div className="relative mt-12 group">
                                <div className="absolute bottom-[calc(100%-1px)] left-8 z-20 flex items-center h-[40px] md:h-[48px] tab-mask tab-mask-mobile px-10 md:px-14 overflow-hidden">
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20 dark:bg-black/40 backdrop-blur-md z-0" />
                                    <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop" alt="Tab BG" className="absolute top-0 left-0 w-[400px] h-[200px] object-cover blur-xl scale-125 opacity-90 z-0" />
                                    <div className="absolute inset-0 bg-black/10 dark:bg-black/40 z-0" />
                                    <h3 className="relative z-10 text-base md:text-lg font-bold text-white whitespace-nowrap">Credits</h3>
                                </div>

                                <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-gray-700/50 min-h-[260px] flex flex-col">
                                    <img
                                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop"
                                        alt="Credits"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-0"
                                    />
                                    <div
                                        className="absolute inset-0 w-[95%] sm:w-[85%] bg-black/10 dark:bg-black/40 z-0"
                                        style={{
                                            backdropFilter: 'blur(16px)',
                                            WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
                                            maskImage: 'linear-gradient(to right, black 65%, transparent 100%)'
                                        }}
                                    />

                                    <div className="relative z-10 pt-12 px-8 pb-8 w-[85%] sm:w-[70%] flex-grow flex flex-col justify-center">
                                        <p className="text-white font-medium text-sm leading-relaxed mb-4">
                                            รูปภาพในหน้านี้นำมากจาก แนวหน้า
                                        </p>
                                        <p className="text-white font-medium text-sm leading-relaxed">
                                            ขอบคุณทุกท่านที่สนับสนุนโครงการนี้
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Us Card */}
                            <div className="relative mt-12 group">
                                <div className="absolute bottom-[calc(100%-1px)] left-8 z-20 flex items-center h-[40px] md:h-[48px] tab-mask tab-mask-mobile px-10 md:px-14 overflow-hidden">
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20 dark:bg-black/40 backdrop-blur-md z-0" />
                                    <img src="https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=800&auto=format&fit=crop" alt="Tab BG" className="absolute top-0 left-0 w-[400px] h-[200px] object-cover blur-xl scale-125 opacity-90 z-0" />
                                    <div className="absolute inset-0 bg-black/10 dark:bg-black/40 z-0" />
                                    <h3 className="relative z-10 text-base md:text-lg font-bold text-white whitespace-nowrap">Contact Us</h3>
                                </div>

                                <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-gray-700/50 min-h-[260px] flex flex-col">
                                    <img
                                        src="https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=800&auto=format&fit=crop"
                                        alt="Contact Us"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-0"
                                    />
                                    <div
                                        className="absolute inset-0 w-[95%] sm:w-[85%] bg-black/10 dark:bg-black/40 z-0"
                                        style={{
                                            backdropFilter: 'blur(16px)',
                                            WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
                                            maskImage: 'linear-gradient(to right, black 65%, transparent 100%)'
                                        }}
                                    />

                                    <div className="relative z-10 pt-12 px-8 pb-8 w-[85%] sm:w-[70%] flex-grow flex flex-col justify-center">
                                        <p className="text-white font-medium text-sm leading-relaxed mb-4">
                                            ติดต่อเราได้ผ่านแบบฟอร์ม Google Forms (โปรดใช้อีเมลโรงเรียนในการติดต่อ)
                                        </p>
                                        <a
                                            href="https://forms.gle/1Te39d2yoXZYDfNr5"
                                            className="group inline-flex items-center gap-2 px-4 py-2 border-2 border-white/80 text-white text-sm font-medium rounded-lg hover:bg-white hover:text-gray-900 transition-colors w-max shadow-sm"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ติดต่อเรา
                                            <div className="overflow-hidden">
                                                <MoveUpRight className="w-4 h-4 animate-move-up-right" />
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology & Features - Slide 1 (Header) */}
            <section className="relative w-full h-screen sticky top-0 overflow-hidden z-[30]">
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                    <source src="/video/rain.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-y-0 left-0 w-full md:w-1/2 bg-black/20 backdrop-blur-3xl z-10 flex items-center p-8 md:p-16">
                    <div className="text-white max-w-xl">
                        <h2 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg leading-tight">
                            Technology & Features
                        </h2>
                        <p className="text-xl text-gray-300 mb-8 font-medium">เทคโนโลยีและฟีเจอร์</p>
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full animate-bounce border border-white/20">
                            <span className="text-sm font-medium">Scroll to explore</span>
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </section>

            {/* WebSocket - Slide 2 */}
            <section className="relative w-full h-screen sticky top-0 overflow-hidden z-[31]">
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                    <source src="/video/rain.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-y-0 left-0 w-full md:w-1/2 bg-black/30 backdrop-blur-3xl z-10 flex items-center p-8 md:p-16">
                    <div className="text-white w-full max-w-xl">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-2xl border border-blue-500/30 backdrop-blur-md">
                                <Database className="w-10 h-10 text-blue-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            </div>
                            <div className="flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-2xl border border-green-500/30 backdrop-blur-md">
                                <Monitor className="w-10 h-10 text-green-400" />
                            </div>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            WebSocket Real-time Connection
                        </h3>
                        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
                            WebSocket คือเทคโนโลยีที่ช่วยให้เว็บไซต์สามารถรับข้อมูลแบบ Real-time ได้ทันที
                            โดยไม่ต้องรีเฟรชหน้าเว็บ ทำให้คุณเห็นระดับน้ำล่าสุดได้ทันทีที่เซ็นเซอร์ส่งข้อมูลมา
                        </p>
                    </div>
                </div>
            </section>

            {/* Notifications - Slide 3 */}
            <section className="relative w-full h-screen sticky top-0 overflow-hidden z-[32]">
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                    <source src="/video/rain.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-y-0 left-0 w-full md:w-1/2 bg-black/30 backdrop-blur-3xl z-10 flex items-center p-8 md:p-16">
                    <div className="text-white w-full max-w-xl">
                        <div className="mb-12">
                            <div className="flex items-center justify-center w-24 h-24 bg-red-500/20 rounded-3xl border border-red-500/30 backdrop-blur-md animate-pulse">
                                <Bell className="w-12 h-12 text-red-400" />
                            </div>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            การแจ้งเตือน (Notifications)
                        </h3>
                        <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-12">
                            ระบบสามารถแจ้งเตือนผู้ใช้งานผ่านหลายช่องทาง เมื่อระดับน้ำถึงจุดเตือนภัยหรืออันตราย
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-center gap-5 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                                <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                    <MessageCircle className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <div className="font-bold text-lg">LINE OA</div>
                                    <div className="text-sm text-gray-400">แจ้งเตือนผ่าน LINE</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                                <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-bold text-lg">Discord</div>
                                    <div className="text-sm text-gray-400">แจ้งเตือนผ่าน Discord</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Community - Slide 4 */}
            <section className="relative w-full h-screen sticky top-0 overflow-hidden z-[33]">
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                    <source src="/video/rain.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-y-0 left-0 w-full md:w-1/2 bg-black/30 backdrop-blur-3xl z-10 flex items-center p-8 md:p-16">
                    <div className="text-white w-full max-w-xl">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-2xl border border-purple-500/30 backdrop-blur-md">
                                <Users className="w-10 h-10 text-purple-400" />
                            </div>
                            <div className="flex items-center justify-center w-20 h-20 bg-orange-500/20 rounded-2xl border border-orange-500/30 backdrop-blur-md">
                                <AlertTriangle className="w-10 h-10 text-orange-400" />
                            </div>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            ชุมชนและการรายงาน (Community & Reporting)
                        </h3>
                        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
                            เว็บไซต์นี้เปิดให้ผู้คนสามารถพูดคุย แลกเปลี่ยนข้อมูล และรายงานสถานการณ์น้ำท่วมในพื้นที่ของตนเอง
                            เพื่อช่วยให้ชุมชนสามารถเตรียมพร้อมรับมือกับสถานการณ์ได้อย่างทันท่วงที
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer & Final Notes */}
            <div className="relative z-[40] bg-white dark:bg-gray-900">
                <div className="py-12 text-center border-t border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 font-medium">
                        Made with ❤️ Team หมูแดดเดียว
                    </p>
                </div>
                <Footer />
            </div>
        </div>
    )
}

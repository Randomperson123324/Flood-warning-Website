"use client"

import { ChevronDown, Database, Monitor, Bell, MessageCircle, Users, AlertTriangle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function AboutPage() {
    const [showGradient, setShowGradient] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setShowGradient(true), 500)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 font-sao-chingcha">
            {/* Hero Section - Full Screen */}
            <section className="relative w-full h-screen flex items-end justify-center overflow-hidden">
                {/* Background Image */}
                <img
                    src="/images/about-banner.jpg"
                    alt="About Hero"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Animated Gradient Overlay from Bottom - 30% height */}
                <div
                    className={`absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-white via-white to-transparent transition-all duration-1000 ease-out ${showGradient ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                        }`}
                />

                {/* Blur Header with Navigation */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4">
                    <div className="flex justify-end gap-3">
                        <Link href="/">
                            <button className="group flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 font-medium text-sm transition-all duration-300 hover:bg-white hover:text-gray-900 hover:scale-105 hover:shadow-lg">
                                <span>ไปที่เว็บไซต์</span>
                                <ExternalLink className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </button>
                        </Link>
                        <a
                            href="https://forms.gle/1Te39d2yoXZYDfNr5"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <button className="group flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 font-medium text-sm transition-all duration-300 hover:bg-white hover:text-gray-900 hover:scale-105 hover:shadow-lg">
                                <span>ติดต่อเรา</span>
                                <ExternalLink className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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

            {/* Content Section - 4 Parts with Folder Tab Design */}
            <section className="bg-white dark:bg-gray-900 py-16 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="font-noto-sans-thai">
                        {/* 2x2 Grid of Folder Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* StreetFlood Project Card */}
                                <div className="relative bg-blue-400 rounded-3xl overflow-hidden min-h-[280px]">
                                    {/* Folder Tab with Title */}
                                    <div className="absolute top-0 left-0 bg-blue-500 px-6 py-3 rounded-br-3xl">
                                        <h3 className="text-xl font-bold text-white">StreetFlood Project</h3>
                                    </div>
                                    {/* Content */}
                                    <div className="pt-16 px-6 pb-6">
                                        <p className="text-blue-900 font-medium text-sm leading-relaxed mb-4">
                                            โครงงานระบบติดตามระดับน้ำเฝ้าระวังและเตือนหากระดับน้ำอันตราย
                                            พัฒนาโดยนักเรียน ม.2/2 SMTE กลุ่มหมูแดดเดียว
                                        </p>
                                    </div>
                                </div>

                                {/* Our Mission Card */}
                                <div className="relative bg-green-400 rounded-3xl overflow-hidden min-h-[280px]">
                                    {/* Folder Tab with Title */}
                                    <div className="absolute top-0 left-0 bg-green-500 px-6 py-3 rounded-br-3xl">
                                        <h3 className="text-xl font-bold text-white">Our Mission</h3>
                                    </div>
                                    {/* Content */}
                                    <div className="pt-16 px-6 pb-6">
                                        <ul className="text-green-900 font-medium text-sm space-y-2">
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 bg-green-700 rounded-full mt-1.5 shrink-0" />
                                                พัฒนาระบบแจ้งเตือนภัยที่แม่นยำและรวดเร็ว
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 bg-green-700 rounded-full mt-1.5 shrink-0" />
                                                จัดเก็บประวัติระดับน้ำได้อย่างมีประสิทธิภาพ
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 bg-green-700 rounded-full mt-1.5 shrink-0" />
                                                สามารถใช้งานได้จริง ไม่ล่มบ่อย
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Credits Card */}
                                <div className="relative bg-yellow-400 rounded-3xl overflow-hidden min-h-[280px]">
                                    {/* Folder Tab with Title */}
                                    <div className="absolute top-0 left-0 bg-yellow-500 px-6 py-3 rounded-br-3xl">
                                        <h3 className="text-xl font-bold text-white">Credits</h3>
                                    </div>
                                    {/* Content */}
                                    <div className="pt-16 px-6 pb-6">
                                        <p className="text-yellow-900 font-medium text-sm leading-relaxed mb-4">
                                            รูปภาพในหน้านี้นำมากจาก แนวหน้า
                                        </p>
                                        <p className="text-yellow-900 font-medium text-sm leading-relaxed">
                                            ขอบคุณทุกท่านที่สนับสนุนโครงการนี้
                                        </p>
                                    </div>
                                </div>

                                {/* Contact Us Card */}
                                <div className="relative bg-purple-400 rounded-3xl overflow-hidden min-h-[280px]">
                                    {/* Folder Tab with Title */}
                                    <div className="absolute top-0 left-0 bg-purple-500 px-6 py-3 rounded-br-3xl">
                                        <h3 className="text-xl font-bold text-white">Contact Us</h3>
                                    </div>
                                    {/* Content */}
                                    <div className="pt-16 px-6 pb-6">
                                        <p className="text-purple-900 font-medium text-sm leading-relaxed mb-4">
                                            ติดต่อเราได้ผ่านแบบฟอร์ม Google Forms (โปรดใช้อีเมลโรงเรียนในการติดต่อ)
                                        </p>
                                        <a
                                            href="https://forms.gle/1Te39d2yoXZYDfNr5"
                                            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-purple-700 text-purple-900 text-sm font-medium rounded-lg hover:bg-purple-500 hover:text-white transition-colors"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ติดต่อเรา
                                            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - 30% Logo */}
                        <div className="lg:w-[30%] flex items-start justify-center lg:sticky lg:top-8 lg:self-start">
                            <div className="relative w-48 h-48 md:w-64 md:h-64">
                                <Image
                                    src="/images/floodlogo.png"
                                    alt="StreetFlood Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology & Features Section */}
            <section className="bg-gray-50 dark:bg-gray-800 py-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
                        Technology & Features
                    </h2>

                    {/* WebSocket Section */}
                    <div className="mb-20">
                        {/* Animated Database to Computer */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <div className="flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-2xl">
                                <Database className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            </div>

                            {/* Animated Dots */}
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_0.6s_infinite]" />
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_0.8s_infinite]" />
                            </div>

                            <div className="flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-2xl">
                                <Monitor className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                        </div>

                        <div className="text-center max-w-2xl mx-auto">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                WebSocket Real-time Connection
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                                WebSocket คือเทคโนโลยีที่ช่วยให้เว็บไซต์สามารถรับข้อมูลแบบ Real-time ได้ทันที
                                โดยไม่ต้องรีเฟรชหน้าเว็บ ทำให้คุณเห็นระดับน้ำล่าสุดได้ทันทีที่เซ็นเซอร์ส่งข้อมูลมา
                            </p>
                        </div>
                    </div>

                    {/* Notification Section */}
                    <div className="mb-20">
                        <div className="flex items-center justify-center mb-8">
                            <div className="flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900 rounded-2xl animate-pulse">
                                <Bell className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>
                        </div>

                        <div className="text-center max-w-2xl mx-auto mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                การแจ้งเตือน (Notifications)
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                                ระบบสามารถแจ้งเตือนผู้ใช้งานผ่านหลายช่องทาง เมื่อระดับน้ำถึงจุดเตือนภัยหรืออันตราย
                            </p>
                        </div>

                        {/* Line OA and Discord */}
                        <div className="flex flex-wrap justify-center gap-8">
                            <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-700 rounded-2xl shadow-lg">
                                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                                    <MessageCircle className="w-8 h-8 text-white" />
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">LINE OA</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">แจ้งเตือนผ่าน LINE</span>
                            </div>

                            <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-700 rounded-2xl shadow-lg">
                                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                                    </svg>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">Discord</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">แจ้งเตือนผ่าน Discord</span>
                            </div>
                        </div>
                    </div>

                    {/* Community Section */}
                    <div>
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <div className="flex items-center justify-center w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-2xl">
                                <Users className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex items-center justify-center w-20 h-20 bg-orange-100 dark:bg-orange-900 rounded-2xl">
                                <AlertTriangle className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>

                        <div className="text-center max-w-2xl mx-auto">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                ชุมชนและการรายงาน (Community & Reporting)
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                                เว็บไซต์นี้เปิดให้ผู้คนสามารถพูดคุย แลกเปลี่ยนข้อมูล และรายงานสถานการณ์น้ำท่วมในพื้นที่ของตนเอง
                                เพื่อช่วยให้ชุมชนสามารถเตรียมพร้อมรับมือกับสถานการณ์ได้อย่างทันท่วงที
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="bg-white dark:bg-gray-900 py-8 text-center">
                <p className="text-sm text-gray-500">
                    Made with ❤️ Team หมูแดดเดียว
                </p>
            </div>

            <Footer />
        </div>
    )
}

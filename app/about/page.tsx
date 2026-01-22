"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sao-chingcha">
            {/* 
        Hero Image Section 
      */}
            <div
                className="relative w-full h-[300px] md:h-[400px] bg-gray-800 flex items-center justify-center overflow-hidden"
            >
                {/* Local Image: Place 'about-banner.png' in public/images/ */}
                <img
                    src="/images/about-banner.jpg"
                    alt="About Hero"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />

                {/* Fallback gradient if image not loaded */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500 opacity-80 mix-blend-multiply" />

                <div className="absolute top-4 left-4 z-20">
                    <Link href="/">
                        <Button variant="ghost" className="text-white hover:text-blue-100 hover:bg-white/20">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            ย้อนกลับ (Back)
                        </Button>
                    </Link>
                </div>

                <h1 className="relative z-10 text-4xl md:text-5xl font-bold text-white shadow-sm drop-shadow-md">
                    About Us
                </h1>
            </div>

            <div className="container mx-auto max-w-2xl px-4 pb-12 -mt-10 relative z-10">
                <Card className="shadow-xl border-t-0">
                    <CardContent className="space-y-6 pt-6 text-gray-700 dark:text-gray-300 leading-relaxed font-noto-sans-thai">
                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Project StreeFlood</h3>
                            <p>
                                ระบบติดตามระดับน้ำเฝ้าระวังและเตือนหากระดับน้ำอันตราย
                                พัฒนาโดยนักเรียนโรงเรียนสตรีประเสริฐศิลป์ 3 คน
                                โครงงานคาบครูพิเชด กลุ่มหมูแดดเดียว
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Our mission</h3>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>พัฒนาระบบแจ้งเตือนภัยที่มีความแม่นยำและรวดเร็ว</li>
                                <li>จัดเก็บประวัติระดับน้ำได้อย่างมีประสิทธิภาพ</li>
                                <li>สามารถใช้งานได้จริง ไม่ล่มบ่อย ไม่เอ๋อ(ซึ่งตอนนี้ยังเอ๋ออยู่)</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Credits</h3>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>รูปภาพในหน้านี้นำมากจาก แนวหน้า</li>
                                <li>ฟ้อนต์ในเว็บไซต์นี้คือฟ้อนต์ เสาชิงช้า(Sao Chingcha) ของกรุงเทพมหานคร</li>
                            </ul>
                        </section>                        

                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Contact Us</h3>
                            <p>
                                https://forms.gle/1Te39d2yoXZYDfNr5 (โปรดใช้อีเมลโรงเรียนในการติดต่อ)
                            </p>
                        </section>                 

                        <div className="pt-4 text-center">
                            <p className="text-sm text-gray-500">
                                Made with ❤️ Team หมูแดดเดียว
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Footer />
            </div>
        </div>
    )
}

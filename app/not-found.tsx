'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NotFound() {
    const pathname = usePathname()

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-sao-chingcha">
            <div className="container flex flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="mb-4 text-xl bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                    <span className="text-muted-foreground">https://streeflood.vercel.app</span>
                    <span className="font-bold text-red-600">{pathname}</span>
                </div>
                <h1 className="text-9xl font-bold tracking-tighter text-primary">๔๐๔</h1>
                <h2 className="text-3xl font-semibold tracking-tight">หน้านี้โดนน้ำท่วมไปแล้ว</h2>
                <p className="max-w-[600px] text-muted-foreground text-lg">
                    ขออภัย เราไม่สามารถค้นหาหน้าที่คุณกำลังมองหาได้ อาจเป็นไปได้ว่าลิงก์เสียหรือหน้าถูกลบไปแล้ว
                </p>
                <div className="mt-8">
                    <Link
                        href="/"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                        กลับสู่หน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    )
}

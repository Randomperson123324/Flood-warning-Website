// โลโก้ลิงก์กลับหน้าแรกซึ่งอยู่คนละโซน cross-origin isolation กับหน้า auth —
// ZoneLink บังคับโหลดเอกสารใหม่ให้ COOP/COEP ของหน้าแรกมีผล (ดู lib/isolation.ts)
import { ZoneLink as Link } from "@/components/zone-link"
import { Droplets } from "lucide-react"
import type { ReactNode } from "react"

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-sm animate-fade-in-up p-8">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="glass-panel-strong flex h-9 w-9 items-center justify-center rounded-full">
            <Droplets className="h-5 w-5 text-accent" strokeWidth={2.5} />
          </span>
        </Link>
        <h1 className="text-center text-xl font-semibold">{title}</h1>
        <p className="mb-6 text-center text-sm text-ink-soft">{subtitle}</p>
        {children}
      </div>
    </main>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-ink-soft">{children}</label>
}

export const glassInputClass =
  "glass-panel-strong w-full px-3.5 py-2.5 text-sm outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_rgb(var(--accent-rgb)/0.4)]"

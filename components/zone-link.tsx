"use client"

// ลิงก์ที่รู้จักโซน cross-origin isolation (ดู lib/isolation.ts): ภายในโซนเดียวกัน
// ใช้ next/link ตามปกติ (เร็ว, prefetch ได้) แต่ถ้าข้ามโซนจะสลับเป็น <a> ธรรมดา
// เพื่อบังคับโหลดเอกสารใหม่ ให้ COOP/COEP ของหน้าปลายทางมีผลจริง

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps } from "react"
import { crossesIsolationZone } from "@/lib/isolation"

type ZoneLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string }

export function ZoneLink({ href, ...props }: ZoneLinkProps) {
  const pathname = usePathname()
  if (crossesIsolationZone(pathname ?? "/", href)) {
    return <a href={href} {...props} />
  }
  return <Link href={href} {...props} />
}

"use client"

import { ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

interface FooterLink {
  name: { th: string; en: string }
  url: string
}

const DATA_SOURCES: FooterLink[] = [
  { name: { th: "คลังข้อมูลน้ำแห่งชาติ (ThaiWater)", en: "ThaiWater — National Hydro Data Center" }, url: "https://twa.thaiwater.net/th" },
  { name: { th: "สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)", en: "Hydro–Informatics Institute (HII)" }, url: "https://www.hii.or.th/" },
  { name: { th: "กรมอุตุนิยมวิทยา (TMD)", en: "Thai Meteorological Department (TMD)" }, url: "https://tmd.go.th/" },
  { name: { th: "กรมชลประทาน (RID)", en: "Royal Irrigation Department (RID)" }, url: "https://www2.rid.go.th/th/main" },
]

const OTHERS: FooterLink[] = [
  { name: { th: "กรมป้องกันและบรรเทาสาธารณภัย (ปภ.)", en: "Disaster Prevention & Mitigation (DDPM)" }, url: "https://www.disaster.go.th/" },
  { name: { th: "สำนักการระบายน้ำ กรุงเทพมหานคร", en: "Bangkok Drainage and Sewerage (DDS)" }, url: "https://dds.bangkok.go.th/index2.php" },
]

/** 0.3 s with a sharp launch: ~0.05 s accelerating to top speed, then
 * ~0.25 s gliding down to a stop. Shared by both arrow copies so the swap
 * reads as one continuous motion. */
const ARROW_TRANSITION =
  "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.15,0,0.3,1)]"

function RedirectButton({ link, locale }: { link: FooterLink; locale: string }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group glass-panel-strong glass-interactive flex items-center gap-2 px-3 py-2 text-sm font-medium"
    >
      {locale === "th" ? link.name.th : link.name.en}
      {/* Two stacked copies of the arrow in a clipped box: on hover the
          visible one exits toward its own pointing direction (top-right)
          while the twin slides in from the bottom-left along the same
          diagonal — so the icon appears to fly off and loop around. */}
      <span aria-hidden className="relative h-3.5 w-3.5 shrink-0 overflow-hidden text-accent">
        <ArrowUpRight
          className={`absolute inset-0 h-3.5 w-3.5 ${ARROW_TRANSITION} group-hover:-translate-y-full group-hover:translate-x-full`}
        />
        <ArrowUpRight
          className={`absolute inset-0 h-3.5 w-3.5 -translate-x-full translate-y-full ${ARROW_TRANSITION} group-hover:translate-x-0 group-hover:translate-y-0`}
        />
      </span>
    </a>
  )
}

export function SiteFooter() {
  const { t, locale } = useLanguage()

  return (
    <footer className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
      <div className="glass-panel flex flex-col gap-5 p-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{t("footer", "dataSources")}</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DATA_SOURCES.map((link) => (
              <RedirectButton key={link.url} link={link} locale={locale} />
            ))}
          </div>
        </div>

        <div className="border-t border-border/10" />

        <div>
          <h2 className="text-sm font-semibold tracking-tight">{t("footer", "others")}</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {OTHERS.map((link) => (
              <RedirectButton key={link.url} link={link} locale={locale} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

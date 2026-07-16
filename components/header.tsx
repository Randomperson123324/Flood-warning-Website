"use client"

import { useState } from "react"
// ลิงก์นำทางทุกตัวในนี้ข้ามโซน cross-origin isolation ได้ (เช่น / ↔ /community)
// ZoneLink สลับเป็น <a> โหลดเอกสารใหม่ให้เองเมื่อข้ามโซน — ดู lib/isolation.ts
import { ZoneLink as Link } from "@/components/zone-link"
import { usePathname } from "next/navigation"
import { Bell, Droplets, History, Home, Landmark, LogOut, Menu, MessageCircle, Settings2, User, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { useAlertWatcher } from "@/hooks/use-browser-notifications"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { SITE_CONFIG } from "@/lib/config"
import { cn } from "@/lib/utils"

export function Header() {
  const { t } = useLanguage()
  const { user, profile, signOut, loading, isDev } = useAuth()
  const { sensors, severityBySensor } = useAlertWatcher()
  const pathname = usePathname()
  const atRiskCount = sensors.filter((s) => severityBySensor[s.sensor_id] && severityBySensor[s.sensor_id] !== "normal").length
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Single source of truth for the desktop sidebar, tablet top bar, and
  // mobile menu — adding an item here surfaces it everywhere.
  const navItems = [
    { href: "/community", icon: MessageCircle, label: t("nav", "community"), badge: 0 },
    { href: "/archives", icon: History, label: t("nav", "archives"), badge: 0 },
    { href: "/gov-data", icon: Landmark, label: t("nav", "govData"), badge: 0 },
    { href: "/notifications", icon: Bell, label: t("nav", "notifications"), badge: atRiskCount },
    ...(isDev ? [{ href: "/dev-settings", icon: Settings2, label: t("nav", "devSettings"), badge: 0 }] : []),
  ]

  /* Hovering the logo morphs it into a Home button: the droplet swaps to a
     house icon and the name/tagline swap to "Home". The resting text stays in
     the layout (just invisible) so the width doesn't jump mid-hover. */
  const logo = (
    <Link href="/" className="group flex min-w-0 items-center gap-2.5">
      <span className="glass-panel-strong relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ease-glass group-hover:scale-110">
        <Droplets
          className="h-5 w-5 text-accent transition-all duration-300 ease-glass group-hover:rotate-90 group-hover:scale-50 group-hover:opacity-0"
          strokeWidth={2.5}
        />
        <Home
          className="absolute h-5 w-5 scale-50 text-accent opacity-0 transition-all duration-300 ease-glass group-hover:scale-100 group-hover:opacity-100"
          strokeWidth={2.5}
        />
      </span>
      <div className="relative min-w-0 leading-tight">
        <div className="transition-opacity duration-300 group-hover:opacity-0">
          <p className="truncate font-semibold tracking-tight">{SITE_CONFIG.site.name}</p>
          <p className="hidden truncate text-xs text-ink-soft sm:block">{t("app", "tagline")}</p>
        </div>
        <p className="absolute inset-0 flex items-center font-semibold tracking-tight text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {t("nav", "home")}
        </p>
      </div>
    </Link>
  )

  return (
    <>
      {/* ── Desktop: always-expanded floating sidebar (lg+). The
          body:has([data-app-sidebar]) rule in globals.css pads page content
          to the right of it. ── */}
      <aside data-app-sidebar className="fixed bottom-4 left-4 top-4 z-40 hidden w-60 lg:block">
        <div className="glass-panel flex h-full flex-col gap-3 p-3">
          <div className="px-1 pt-1">{logo}</div>

          <div className="border-t border-border/10" />

          {/* No overflow-y-auto here: the glass-interactive hover scale makes
              items poke past the container for a moment, which flashed a
              scrollbar. The list is short enough to never need scrolling. */}
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map(({ href, icon: Icon, label, badge }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "glass-interactive flex items-center gap-2.5 rounded-glass-sm px-3 py-2.5 text-sm font-medium",
                    active ? "glass-panel-strong text-accent" : "hover:bg-surface-strong/40",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {badge > 0 && (
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-status-danger animate-pulse-ring" />
                      <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-status-danger text-[10px] font-semibold text-white">
                        {badge}
                      </span>
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border/10" />

          {/* Bottom of the sidebar, so the menus open upward and to the right
              (align="left") — downward/right-aligned would run off-screen here.
              Both are icon-only: side by side, labels like "System" don't fit
              in half the sidebar width, and one labeled + one icon-only
              looked mismatched. */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <LanguageToggle align="left" direction="up" fullWidth hideLabel />
            </div>
            <div className="min-w-0 flex-1">
              <ThemeToggle align="left" direction="up" fullWidth hideLabel />
            </div>
          </div>

          {!loading &&
            (user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="glass-panel-strong glass-interactive flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium"
                title={profile?.username ?? user.email ?? ""}
              >
                <User className="h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-left">{profile?.username ?? user.email}</span>
                <LogOut className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="glass-panel-strong glass-interactive flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-accent"
              >
                <User className="h-4 w-4" />
                {t("nav", "login")}
              </Link>
            ))}
        </div>
      </aside>

      {/* ── Mobile / tablet: sticky top bar (below lg) ── */}
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:hidden">
        <div className="mx-auto max-w-6xl">
          <div className="glass-panel flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            {logo}

            {/* Icon-only on the tablet bar — the title tooltip carries the
                label; full labels live in the sidebar (lg+) and menu (below md). */}
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map(({ href, icon: Icon, label, badge }) => (
                <div key={href} className="relative">
                  <Link
                    href={href}
                    title={label}
                    className="glass-panel-strong glass-interactive flex items-center px-3 py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-accent" />
                  </Link>
                  {badge > 0 && (
                    <>
                      <span className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-status-danger animate-pulse-ring" />
                      <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-semibold text-white">
                        {badge}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />

              {!loading &&
                (user ? (
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="glass-panel-strong glass-interactive hidden items-center gap-2 px-3 py-2 text-sm font-medium md:flex"
                    title={profile?.username ?? user.email ?? ""}
                  >
                    <User className="h-4 w-4 shrink-0 text-accent" />
                    <LogOut className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
                  </button>
                ) : (
                  <Link
                    href="/auth/login"
                    className="glass-panel-strong glass-interactive hidden whitespace-nowrap px-3 py-2 text-sm font-medium text-accent md:block"
                  >
                    {t("nav", "login")}
                  </Link>
                ))}

              {/* Everything above (community/notifications/dev-settings/user) collapses
                  into this single button below md — hiding it with no replacement was
                  the old behavior and made those pages unreachable on mobile. */}
              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="glass-panel-strong glass-interactive flex h-10 w-10 items-center justify-center"
                  aria-label={t("nav", "menu")}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="h-4 w-4 text-accent" /> : <Menu className="h-4 w-4 text-accent" />}
                </button>
                {!mobileMenuOpen && atRiskCount > 0 && (
                  <span className="pointer-events-none absolute -right-1 -top-1 h-3 w-3 rounded-full bg-status-danger animate-pulse-ring" />
                )}
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="glass-panel-strong animate-fade-in-up mt-2 flex flex-col gap-1 p-2 md:hidden">
              {navItems.map(({ href, icon: Icon, label, badge }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="glass-interactive flex items-center gap-2 rounded-glass-sm px-3 py-2.5 text-sm font-medium"
                >
                  <Icon className="h-4 w-4 text-accent" />
                  {label}
                  {badge > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
              <div className="my-1 border-t border-border/10" />
              {!loading &&
                (user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut()
                    }}
                    className="glass-interactive flex items-center gap-2 rounded-glass-sm px-3 py-2.5 text-left text-sm font-medium"
                  >
                    <LogOut className="h-4 w-4 text-ink-soft" />
                    <span className="truncate">{profile?.username ?? user.email}</span>
                  </button>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="glass-interactive flex items-center gap-2 rounded-glass-sm px-3 py-2.5 text-sm font-medium text-accent"
                  >
                    <User className="h-4 w-4" />
                    {t("nav", "login")}
                  </Link>
                ))}
            </div>
          )}
        </div>
      </header>
    </>
  )
}

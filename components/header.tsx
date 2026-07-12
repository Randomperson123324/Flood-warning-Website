"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Droplets, History, Home, Landmark, LogOut, Menu, MessageCircle, Settings2, User, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { useAlertWatcher } from "@/hooks/use-browser-notifications"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { SITE_CONFIG } from "@/lib/config"

export function Header() {
  const { t } = useLanguage()
  const { user, profile, signOut, loading, isDev } = useAuth()
  const { sensors, severityBySensor } = useAlertWatcher()
  const atRiskCount = sensors.filter((s) => severityBySensor[s.sensor_id] && severityBySensor[s.sensor_id] !== "normal").length
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Single source of truth for both the desktop nav and the mobile menu.
  // Desktop renders icon-only below lg (title tooltip carries the label) so
  // the bar keeps fitting as more items are added.
  const navItems = [
    { href: "/community", icon: MessageCircle, label: t("nav", "community"), badge: 0 },
    { href: "/archives", icon: History, label: t("nav", "archives"), badge: 0 },
    { href: "/gov-data", icon: Landmark, label: t("nav", "govData"), badge: 0 },
    { href: "/notifications", icon: Bell, label: t("nav", "notifications"), badge: atRiskCount },
    ...(isDev ? [{ href: "/dev-settings", icon: Settings2, label: t("nav", "devSettings"), badge: 0 }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="glass-panel flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Hovering the logo morphs it into a Home button: the droplet swaps
              to a house icon and the name/tagline swap to "Home". The resting
              text stays in the layout (just invisible) so the header width
              doesn't jump mid-hover. */}
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

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, icon: Icon, label, badge }) => (
              <div key={href} className="relative">
                <Link
                  href={href}
                  title={label}
                  className="glass-panel-strong glass-interactive flex items-center gap-1.5 px-3 py-2 text-sm font-medium"
                >
                  <Icon className="h-4 w-4 shrink-0 text-accent" />
                  <span className="hidden whitespace-nowrap lg:inline">{label}</span>
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
                  <span className="hidden max-w-[6rem] truncate lg:inline">{profile?.username ?? user.email}</span>
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
  )
}

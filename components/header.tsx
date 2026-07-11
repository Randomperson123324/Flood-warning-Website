"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Droplets, LogOut, Menu, MessageCircle, Settings2, User, X } from "lucide-react"
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

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="glass-panel flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="glass-panel-strong flex h-9 w-9 items-center justify-center rounded-full">
              <Droplets className="h-5 w-5 text-accent" strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">{SITE_CONFIG.site.name}</p>
              <p className="hidden text-xs text-ink-soft sm:block">{t("app", "tagline")}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/community" className="glass-panel-strong glass-interactive flex items-center gap-1.5 px-3 py-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-accent" />
              {t("nav", "community")}
            </Link>
            <div className="relative">
              <Link
                href="/notifications"
                className="glass-panel-strong glass-interactive flex items-center gap-1.5 px-3 py-2 text-sm font-medium"
              >
                <Bell className="h-4 w-4 text-accent" />
                {t("nav", "notifications")}
              </Link>
              {atRiskCount > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-status-danger animate-pulse-ring" />
              )}
              {atRiskCount > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-semibold text-white">
                  {atRiskCount}
                </span>
              )}
            </div>
            {isDev && (
              <Link
                href="/dev-settings"
                className="glass-panel-strong glass-interactive flex items-center gap-1.5 px-3 py-2 text-sm font-medium"
              >
                <Settings2 className="h-4 w-4 text-accent" />
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
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
                  <User className="h-4 w-4 text-accent" />
                  <span className="max-w-[6rem] truncate">{profile?.username ?? user.email}</span>
                  <LogOut className="h-3.5 w-3.5 text-ink-soft" />
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="glass-panel-strong glass-interactive hidden px-3 py-2 text-sm font-medium text-accent md:block"
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
            <Link
              href="/community"
              onClick={() => setMobileMenuOpen(false)}
              className="glass-interactive flex items-center gap-2 rounded-glass-sm px-3 py-2.5 text-sm font-medium"
            >
              <MessageCircle className="h-4 w-4 text-accent" />
              {t("nav", "community")}
            </Link>
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className="glass-interactive flex items-center gap-2 rounded-glass-sm px-3 py-2.5 text-sm font-medium"
            >
              <Bell className="h-4 w-4 text-accent" />
              {t("nav", "notifications")}
              {atRiskCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-semibold text-white">
                  {atRiskCount}
                </span>
              )}
            </Link>
            {isDev && (
              <Link
                href="/dev-settings"
                onClick={() => setMobileMenuOpen(false)}
                className="glass-interactive flex items-center gap-2 rounded-glass-sm px-3 py-2.5 text-sm font-medium"
              >
                <Settings2 className="h-4 w-4 text-accent" />
                {t("nav", "devSettings")}
              </Link>
            )}
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

import { SITE_CONFIG } from "@/lib/config"

/** Empty allow-list = open registration (any domain accepted). */
export function isEmailDomainAllowed(email: string): boolean {
  const allowed = SITE_CONFIG.site.allowedEmailDomains
  if (allowed.length === 0) return true

  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false

  return allowed.includes(domain)
}

export function allowedDomainsLabel(): string | null {
  const allowed = SITE_CONFIG.site.allowedEmailDomains
  if (allowed.length === 0) return null
  return allowed.map((d) => `@${d}`).join(", ")
}

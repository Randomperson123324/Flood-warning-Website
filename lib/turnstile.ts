const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

/**
 * Verifies a Turnstile token server-side. Returns true automatically when
 * Turnstile isn't configured (no secret key) — Phase 2 decision: bot
 * protection is optional and auto-disables itself when unset, rather than
 * blocking submissions with no way to pass.
 */
export async function verifyTurnstileToken(token: string | null | undefined): Promise<{ ok: boolean; reason?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

  if (!secretKey) return { ok: true }
  if (!token) return { ok: false, reason: "missing_token" }

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    })
    const data = await res.json()
    return data.success ? { ok: true } : { ok: false, reason: data["error-codes"]?.join(",") ?? "verification_failed" }
  } catch {
    return { ok: false, reason: "verify_request_failed" }
  }
}

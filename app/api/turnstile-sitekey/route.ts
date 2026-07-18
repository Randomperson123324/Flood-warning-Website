import { NextResponse } from "next/server"

// Read the env at request time (supports runtime-configured deployments)
// instead of baking a build-time snapshot into a static response.
export const dynamic = "force-dynamic"

export async function GET() {
  // This now correctly reads CLOUDFLARE_TURNSTILE_SITE_KEY (without NEXT_PUBLIC_)
  const siteKey = process.env.CLOUDFLARE_TURNSTILE_SITE_KEY

  if (!siteKey) {
    console.error("Server: CLOUDFLARE_TURNSTILE_SITE_KEY is not set.")
    return NextResponse.json(
      {
        error: "Turnstile site key not configured",
        details: "CLOUDFLARE_TURNSTILE_SITE_KEY environment variable is missing.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ siteKey })
}

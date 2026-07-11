import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) return NextResponse.redirect(`${origin}/auth/auth-code-error`)

  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.redirect(`${origin}/auth/auth-code-error`)

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return NextResponse.redirect(`${origin}/auth/auth-code-error`)

  const { data: existingProfile } = await supabase.from("users").select("id").eq("id", data.user.id).single()

  if (!existingProfile) {
    const username = data.user.user_metadata?.username || data.user.email?.split("@")[0] || "user"
    await supabase.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      username,
      is_online: true,
    })
  }

  return NextResponse.redirect(`${origin}/auth/confirm-success`)
}

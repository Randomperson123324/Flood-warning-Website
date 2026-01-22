import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type") // Supabase includes 'type' param for email confirmations
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user profile exists, if not create it
      const { data: existingProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()
      
      // Track if this is a new signup (profile didn't exist)
      const isNewSignup = !existingProfile

      if (!existingProfile) {
        const username = data.user.user_metadata?.username || data.user.email?.split("@")[0] || "User"
        console.log("[v0] Creating user profile with username:", username)

        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          username: username,
          is_online: true,
        })
      } else {
        // Update online status
        await supabase
          .from("users")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("id", data.user.id)
      }

      const forwardedHost = request.headers.get("x-forwarded-host") // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development"
      
      // Redirect to success page if this is an email confirmation
      // New signup (profile didn't exist) = email confirmation from signup
      // Or check type parameter for email confirmation links
      // Or if email was just confirmed (check if email_confirmed_at is very recent)
      const emailJustConfirmed = data.user.email_confirmed_at && 
        new Date(data.user.email_confirmed_at).getTime() > Date.now() - 60000 // Confirmed within last minute
      
      const isEmailConfirmation = isNewSignup || type === "signup" || type === "email" || emailJustConfirmed
      
      console.log("[v0] Email confirmation check:", { 
        isNewSignup, 
        type, 
        emailJustConfirmed,
        email_confirmed_at: data.user.email_confirmed_at,
        isEmailConfirmation 
      })
      
      // Always redirect to home with email confirmation flag for email confirmations
      // This ensures users see the popup when confirming their email
      if (isEmailConfirmation || !next || next === "/") {
        console.log("[v0] Redirecting to home with email confirmation flag")
        const redirectUrl = isLocalEnv 
          ? `${origin}/?emailConfirmed=true`
          : forwardedHost 
            ? `https://${forwardedHost}/?emailConfirmed=true`
            : `${origin}/?emailConfirmed=true`
        return NextResponse.redirect(redirectUrl)
      }

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

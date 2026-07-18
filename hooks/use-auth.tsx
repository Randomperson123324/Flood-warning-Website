"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import { isEmailDomainAllowed } from "@/lib/auth/email-domain"
import type { UserProfile } from "@/types"

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isDev: boolean
  signUp: (params: {
    email: string
    password: string
    username: string
    captchaToken?: string
  }) => Promise<{ error: string | null }>
  signIn: (params: { email: string; password: string; captchaToken?: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null
  const { data } = await supabase.from("users").select("*").eq("id", userId).single()
  return data ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) setProfile(await fetchProfile(data.session.user.id))
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        const userId = nextSession.user.id
        // Defer Supabase calls out of the callback itself — awaiting queries
        // inside onAuthStateChange can deadlock (the SDK holds an internal
        // lock while the callback runs). See supabase-js docs on this.
        setTimeout(async () => {
          setProfile(await fetchProfile(userId))
          await supabase!
            .from("users")
            .update({ is_online: true, last_seen: new Date().toISOString() })
            .eq("id", userId)
        }, 0)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp({
    email,
    password,
    username,
    captchaToken,
  }: {
    email: string
    password: string
    username: string
    captchaToken?: string
  }) {
    if (!supabase) return { error: "Supabase is not configured" }
    if (!isEmailDomainAllowed(email)) return { error: "อีเมลนี้ไม่ได้รับอนุญาตให้สมัครสมาชิก" }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        captchaToken,
      },
    })
    return { error: error?.message ?? null }
  }

  async function signIn({ email, password, captchaToken }: { email: string; password: string; captchaToken?: string }) {
    if (!supabase) return { error: "Supabase is not configured" }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    if (!supabase) return
    if (session?.user) {
      await supabase.from("users").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", session.user.id)
    }
    await supabase.auth.signOut()
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      isDev: profile?.role === "dev",
      signUp,
      signIn,
      signOut,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

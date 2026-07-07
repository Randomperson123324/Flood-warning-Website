import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client for use inside API route handlers / server
 * components. Pass a user JWT to run queries under that user's RLS
 * identity; omit it for anonymous (still RLS-governed) access.
 */
export function createServerSupabaseClient(token?: string): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return null

  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
  }

  return createClient(supabaseUrl, supabaseKey)
}

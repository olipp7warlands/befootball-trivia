"use server"

import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

export async function signInWithEmail(
  email: string,
  meta?: { username: string; cardSeed: number; countryCode: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        ...(meta && {
          data: {
            username: meta.username,
            card_seed: meta.cardSeed,
            country_code: meta.countryCode,
          },
        }),
      },
    })

    if (error) {
      console.error("[auth] OTP sign-in failed:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[auth] Unexpected error in signInWithEmail:", err)
    return { success: false, error: message }
  }
}

export async function createProfile(data: {
  username: string
  country_code: string
  card_seed: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      username: data.username,
      country_code: data.country_code,
      card_seed: data.card_seed,
    })

    if (error) {
      console.error("[auth] Profile insert failed:", error)
      // Unique constraint on username surfaces as code 23505
      if (error.code === "23505") {
        return { success: false, error: "Username already taken" }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[auth] Unexpected error in createProfile:", err)
    return { success: false, error: message }
  }
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error || !profile) return null

    return profile as Profile
  } catch (err) {
    console.error("[auth] Unexpected error in getProfile:", err)
    return null
  }
}

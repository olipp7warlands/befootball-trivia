"use server"

import { createAdminClient } from "@/lib/supabase/admin"

async function fireWebhook(
  url: string,
  payload: Record<string, unknown>,
  leadId: string
): Promise<void> {
  const delays = [100, 200, 400]

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Webhook responded with status ${res.status}`)
      }

      // Sync successful — stamp the lead
      const admin = createAdminClient()
      await admin
        .from("leads")
        .update({ synced_at: new Date().toISOString() })
        .eq("id", leadId)

      return
    } catch (err) {
      const isLastAttempt = attempt === delays.length - 1
      if (isLastAttempt) {
        console.error("[leads] Webhook failed after 3 attempts:", err)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }
}

export async function submitLead(data: {
  email: string
  name: string
  country_code: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        email: data.email,
        name: data.name,
        country_code: data.country_code,
        source: "trivia-mundiales",
      })
      .select("id")
      .single()

    if (error) {
      console.error("[leads] Insert failed:", error)
      return { success: false, error: error.message }
    }

    const webhookUrl = process.env.LEAD_WEBHOOK_URL
    if (webhookUrl) {
      // Fire-and-forget — do not block the response
      fireWebhook(
        webhookUrl,
        {
          email: data.email,
          name: data.name,
          country: data.country_code,
          source: "trivia-mundiales",
          timestamp: new Date().toISOString(),
          metadata: {},
        },
        lead.id
      )
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[leads] Unexpected error:", err)
    return { success: false, error: message }
  }
}

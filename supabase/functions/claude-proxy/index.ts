// claude-proxy: the only path from the app to Anthropic.
// 1. Checks who is signed in.  2. Finds their family.
// 3. Uses up one of the family's 30 daily AI messages (or politely refuses).
// 4. Forwards the request to Anthropic with the secret API key.
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets):
//   ANTHROPIC_API_KEY   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically)
import { createClient } from "npm:@supabase/supabase-js@2";

const DAILY_FAMILY_LIMIT = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json(401, { error: "unauthorized", message: "Please sign in to use AI features." });
  }

  const { data: membership } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!membership?.family_id) {
    return json(403, { error: "no_family", message: "Set up your family first to use AI features." });
  }

  const { data: usage, error: usageErr } = await admin
    .rpc("consume_ai_message", { p_family_id: membership.family_id, p_limit: DAILY_FAMILY_LIMIT })
    .single();
  if (usageErr || !usage) {
    return json(500, { error: "usage_check_failed", message: "Something went wrong. Please try again in a moment." });
  }
  if (!usage.allowed) {
    return json(429, {
      error: "daily_limit_reached",
      message: `Your family has used all ${DAILY_FAMILY_LIMIT} AI messages for today. They refresh at midnight (Sydney time), so I'll be ready to help again tomorrow.`,
      used: usage.used,
      limit: usage.daily_limit,
    });
  }

  const body = await req.text();
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body,
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

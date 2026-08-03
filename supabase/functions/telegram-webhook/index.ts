// ─── Edge Function: Telegram Webhook ──────────────────────────────────────
// Recebe updates do Telegram. Somente IDs autorizados são processados.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const update = await req.json().catch(() => null);
    const message = update?.message ?? update?.edited_message;
    const fromId = message?.from?.id;
    if (!fromId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IDs autorizados: config no banco, com fallback para o secret
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cfg } = await admin
      .from("integracoes_config")
      .select("ativo, config")
      .eq("nome", "telegram")
      .maybeSingle();

    const idsRaw = String(
      (cfg?.config as Record<string, unknown> | null)?.authorized_ids ??
        Deno.env.get("TELEGRAM_AUTHORIZED_IDS") ??
        "",
    );
    const authorized = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    if (cfg?.ativo === false || (authorized.length > 0 && !authorized.includes(String(fromId)))) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Telegram update recebido de", fromId, message?.text ?? "(mídia)");

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("telegram-webhook error:", (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

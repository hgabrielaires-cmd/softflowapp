// ─── Edge Function: Testes de Integração (Telegram / Anthropic) ───────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: exige usuário autenticado ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // ── Telegram: getMe ──
    if (action === "test_telegram") {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!token) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" }, 400);

      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        return json({ ok: false, error: data?.description || "Token inválido" }, 200);
      }
      return json({ ok: true, username: data.result?.username, name: data.result?.first_name });
    }

    // ── Telegram: setWebhook ──
    if (action === "setup_telegram_webhook") {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!token) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" }, 400);

      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "edited_message"],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        return json({ ok: false, error: data?.description || "Falha ao registrar webhook" }, 200);
      }
      return json({ ok: true, webhook_url: webhookUrl });
    }

    // ── Anthropic: chamada simples ──
    if (action === "test_anthropic") {
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) return json({ ok: false, error: "ANTHROPIC_API_KEY não configurada" }, 400);

      const model = typeof body?.model === "string" && body.model ? body.model : "claude-sonnet-4-6";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 16,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return json({ ok: false, error: data?.error?.message || `Erro ${res.status}` }, 200);
      }
      return json({ ok: true, model: data?.model || model });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

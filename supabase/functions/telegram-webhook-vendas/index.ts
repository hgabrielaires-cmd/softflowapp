// ─── Edge Function: Telegram Webhook (vendedor / propostas) ───────────────
// Bot dedicado: @SoftplusVendas_Bot — separado do @softplusFinanceiro_Bot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buscarVendedor, handleVendedorMessage, handleVendedorCallback } from "./vendedor.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("TELEGRAM_VENDAS_BOT_TOKEN") ?? "";
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);

  // ── SETUP: registrar webhook ──
  if (url.searchParams.get("action") === "setup") {
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook-vendas`;
    const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message", "callback_query"],
      }),
    });
    return ok(await res.json());
  }

  // ── TEST ──
  if (url.searchParams.get("action") === "test") {
    const res = await fetch(`${TELEGRAM_API}${token}/getMe`);
    return ok(await res.json());
  }

  if (req.method !== "POST") return ok();

  try {
    const body = await req.json().catch(() => null);
    const callbackQuery = body?.callback_query;
    const message = body?.message ?? body?.edited_message ?? callbackQuery?.message;
    if (!message) return ok();

    const chatId = message.chat?.id as number;
    const userId = (callbackQuery?.from?.id ?? message.from?.id) as number;
    const text = String(message.text ?? "").trim();

    const vendedor = await buscarVendedor(supabase, userId);
    if (!vendedor) {
      await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "⛔ Seu Telegram ainda não está vinculado a um vendedor no Softflow. Peça pro admin cadastrar seu ID.",
        }),
      });
      return ok();
    }

    if (callbackQuery) {
      await handleVendedorCallback(supabase, token, chatId, vendedor, callbackQuery);
    } else {
      await handleVendedorMessage(supabase, token, anthropicKey, chatId, vendedor, text, userId);
    }
    return ok();
  } catch (err) {
    console.error("[telegram-vendas] Erro:", (err as Error).message);
    return ok();
  }
});

// ─── Edge Function: Conta Azul OAuth ──────────────────────────────────────
// Actions: authorize | callback | refresh | sync | status
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CONTAAZUL_AUTH_BASE,
  contaazulEnv,
  exchangeToken,
  getValidToken,
} from "../_shared/contaazul.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const isCallbackPath = url.pathname.endsWith("/callback");
  const action = isCallbackPath ? "callback" : (url.searchParams.get("action") || "status");
  const { clientId, clientSecret, redirectUri, appUrl } = contaazulEnv();

  try {
    if (!clientId || !clientSecret || !redirectUri) {
      return json({ error: "Credenciais da Conta Azul não configuradas" }, 400);
    }

    const supabase = admin();

    // ── authorize ──
    if (action === "authorize") {
      const filialId = url.searchParams.get("filial_id") || "";
      const authUrl = new URL("https://api.contaazul.com/auth/authorize");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("scope", "sales");
      authUrl.searchParams.set("state", filialId);
      authUrl.searchParams.set("response_type", "code");
      return Response.redirect(authUrl.toString(), 302);
    }


    // ── callback ──
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const filialId = state && state.length === 36 ? state : null;
      if (!code) return Response.redirect(`${appUrl}/integracoes?contaazul=erro`, 302);

      const tok = await exchangeToken({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      });


      const payload = {
        filial_id: filialId,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? null,
        expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
        scope: tok.scope ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("contaazul_tokens")
        .select("id")
        .eq("filial_id", filialId)
        .maybeSingle();

      if (existing) {
        await supabase.from("contaazul_tokens").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("contaazul_tokens").insert(payload);
      }

      return Response.redirect(`${appUrl}/integracoes?contaazul=conectado`, 302);
    }

    // ── refresh ──
    if (action === "refresh") {
      const row = await getValidToken(supabase, url.searchParams.get("filial_id"));
      if (!row) return json({ error: "Nenhuma conexão encontrada" }, 404);
      return json({ ok: true, expires_at: row.expires_at });
    }

    // ── disconnect ──
    if (action === "disconnect") {
      const filialId = url.searchParams.get("filial_id");
      let del = supabase.from("contaazul_tokens").delete();
      del = filialId ? del.eq("filial_id", filialId) : del.not("id", "is", null);
      const { error } = await del;
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ── sync (delega para contaazul-sync) ──
    if (action === "sync") {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/contaazul-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      return json(out, res.status);
    }

    // ── status ──
    const { data } = await supabase
      .from("contaazul_tokens")
      .select("filial_id, expires_at, updated_at")
      .order("updated_at", { ascending: false });
    return json({ ok: true, conexoes: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("contaazul-oauth:", message);
    if (action === "callback") {
      return Response.redirect(`${appUrl}/integracoes?contaazul=erro`, 302);
    }
    return json({ error: message }, 500);
  }
});

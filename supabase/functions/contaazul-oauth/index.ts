// ─── Edge Function: Conta Azul OAuth ──────────────────────────────────────
// Actions: authorize | callback | refresh | sync
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AUTH_BASE = "https://app.contaazul.com/t/contaazul.com/oauth2/v2.0";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function env() {
  return {
    clientId: Deno.env.get("CONTAAZUL_CLIENT_ID") || "",
    clientSecret: Deno.env.get("CONTAAZUL_CLIENT_SECRET") || "",
    redirectUri: Deno.env.get("CONTAAZUL_REDIRECT_URI") || "",
    appUrl: Deno.env.get("CONTAAZUL_APP_URL") || "https://softflow.app.br",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function exchangeToken(params: Record<string, string>) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Conta Azul token [${res.status}]: ${text}`);
  return JSON.parse(text);
}

export async function getValidToken(supabase: any, filialId?: string | null) {
  let q = supabase.from("contaazul_tokens").select("*").order("updated_at", { ascending: false }).limit(1);
  if (filialId) q = supabase.from("contaazul_tokens").select("*").eq("filial_id", filialId).limit(1);
  const { data } = await q;
  const row = data?.[0];
  if (!row) return null;

  const expired = row.expires_at ? new Date(row.expires_at).getTime() - 60_000 < Date.now() : false;
  if (!expired) return row;
  if (!row.refresh_token) return row;

  const { clientId, clientSecret } = env();
  const tok = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const { data: updated } = await supabase
    .from("contaazul_tokens")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? row.refresh_token,
      expires_at: expiresAt,
      scope: tok.scope ?? row.scope,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select()
    .maybeSingle();

  return updated ?? row;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const isCallbackPath = url.pathname.endsWith("/callback");
  const action = isCallbackPath ? "callback" : (url.searchParams.get("action") || "status");
  const { clientId, clientSecret, redirectUri, appUrl } = env();

  try {
    if (!clientId || !clientSecret || !redirectUri) {
      return json({ error: "Credenciais da Conta Azul não configuradas" }, 400);
    }

    const supabase = admin();

    // ── authorize ──
    if (action === "authorize") {
      const filialId = url.searchParams.get("filial_id") || "";
      const authUrl = new URL(`${AUTH_BASE}/authorize`);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "sales financials openid profile aws.cognito.signin.user.admin");
      authUrl.searchParams.set("state", filialId);
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
        client_id: clientId,
        client_secret: clientSecret,
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
      const filialId = url.searchParams.get("filial_id");
      const row = await getValidToken(supabase, filialId);
      if (!row) return json({ error: "Nenhuma conexão encontrada" }, 404);
      return json({ ok: true, expires_at: row.expires_at });
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

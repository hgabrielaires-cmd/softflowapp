// ─── Edge Function: Login Guard ───────────────────────────────────────────
// Encapsula as rotinas de bloqueio/registro de tentativas de login,
// evitando expor as funções SECURITY DEFINER diretamente na API pública.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não suportado" }, 405);

  const body = await req.json().catch(() => null) as
    | { action?: string; email?: string; success?: boolean; ip?: string | null }
    | null;

  const action = body?.action;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (action !== "check" && action !== "record") {
    return json({ error: "Ação inválida" }, 400);
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "E-mail inválido" }, 400);
  }
  if (action === "record" && typeof body?.success !== "boolean") {
    return json({ error: "Parâmetro 'success' inválido" }, 400);
  }

  const ipHeader = req.headers.get("x-forwarded-for") ?? "";
  const ip = ipHeader.split(",")[0]?.trim() ||
    (typeof body?.ip === "string" ? body.ip.slice(0, 60) : null);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (action === "check") {
      const { data, error } = await supabase.rpc("check_login_blocked", { p_email: email });
      if (error) throw error;
      return json({ blocked: data === true });
    }

    const { error } = await supabase.rpc("record_login_attempt", {
      p_email: email,
      p_success: body!.success,
      p_ip: ip,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error("login-guard:", err instanceof Error ? err.message : err);
    return json({ error: "Não foi possível processar a solicitação" }, 500);
  }
});

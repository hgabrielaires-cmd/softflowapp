// ─── Conta Azul: helpers compartilhados ───────────────────────────────────
export const CONTAAZUL_TOKEN_URL = "https://auth.contaazul.com/oauth2/token";

export function contaazulEnv() {
  return {
    clientId: Deno.env.get("CONTAAZUL_CLIENT_ID") || "",
    clientSecret: Deno.env.get("CONTAAZUL_CLIENT_SECRET") || "",
    redirectUri: Deno.env.get("CONTAAZUL_REDIRECT_URI") || "",
    appUrl: Deno.env.get("CONTAAZUL_APP_URL") || "https://softflow.app.br",
  };
}

export async function exchangeToken(
  params: Record<string, string>,
  clientId?: string,
  clientSecret?: string,
) {
  const credentials = btoa(`${clientId ?? contaazulEnv().clientId}:${clientSecret ?? contaazulEnv().clientSecret}`);
  const res = await fetch(CONTAAZUL_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Conta Azul token [${res.status}]: ${text}`);
  return JSON.parse(text);
}

// Retorna o token válido da filial (renova automaticamente se expirado)
export async function getValidToken(supabase: any, filialId?: string | null) {
  const query = filialId
    ? supabase.from("contaazul_tokens").select("*").eq("filial_id", filialId).limit(1)
    : supabase.from("contaazul_tokens").select("*").order("updated_at", { ascending: false }).limit(1);

  const { data } = await query;
  const row = data?.[0];
  if (!row) return null;

  const expired = row.expires_at
    ? new Date(row.expires_at).getTime() - 60_000 < Date.now()
    : false;
  if (!expired || !row.refresh_token) return row;

  const tok = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  });

  const { data: updated } = await supabase
    .from("contaazul_tokens")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? row.refresh_token,
      expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      scope: tok.scope ?? row.scope,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select()
    .maybeSingle();

  return updated ?? row;
}

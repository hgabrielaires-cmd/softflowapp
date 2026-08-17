// ─── Autenticação compartilhada das functions financeiras ────────────────
// Regra: FAIL CLOSED. Nunca aceitar anon key. Nunca aceitar por omissão.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthResult =
  | { ok: true; via: "service_role" | "cron_secret" | "user"; userId?: string }
  | { ok: false; status: 401 | 403; error: string };

/** Aceita apenas: service_role, CRON_SECRET ou usuário logado com papel admin/financeiro. */
export async function authorizeFinanceiro(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Não autorizado" };

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (serviceRoleKey && token === serviceRoleKey) return { ok: true, via: "service_role" };
  if (cronSecret && token === cronSecret) return { ok: true, via: "cron_secret" };

  // Anon key NUNCA é credencial válida
  if (anonKey && token === anonKey) return { ok: false, status: 401, error: "Não autorizado" };

  // Segredo de agendamento guardado no cofre do banco (usado pelo pg_cron)
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
    const { data: vaultCron } = await admin.rpc("get_cron_secret");
    if (typeof vaultCron === "string" && vaultCron.length > 0 && token === vaultCron) {
      return { ok: true, via: "cron_secret" };
    }
  } catch { /* segue para validação de usuário */ }

  const { data, error } = await createClient(Deno.env.get("SUPABASE_URL")!, anonKey)
    .auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { ok: false, status: 401, error: "Token inválido" };

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const permitido = (roles ?? []).some((r: { role: string }) =>
    r.role === "admin" || r.role === "financeiro"
  );
  if (!permitido) return { ok: false, status: 403, error: "Acesso negado: requer papel financeiro ou admin" };

  return { ok: true, via: "user", userId: user.id };
}

export function authErrorResponse(
  res: Extract<AuthResult, { ok: false }>,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify({ error: res.error }), {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

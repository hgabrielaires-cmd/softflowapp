import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GRAPH = "https://graph.facebook.com/v19.0";

interface MetaConfig {
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  verify_token: string;
  phone_number: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getConfig(admin: ReturnType<typeof createClient>): Promise<MetaConfig | null> {
  const { data } = await admin
    .from("integracoes_config")
    .select("config")
    .eq("nome", "whatsapp_meta")
    .maybeSingle();
  const cfg = (data as any)?.config;
  if (!cfg?.access_token || !cfg?.phone_number_id) return null;
  return cfg as MetaConfig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await anon.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const cfg = await getConfig(admin);
    if (!cfg) return json({ ok: false, error: "Integração WhatsApp Meta não configurada" }, 400);

    const headers = {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    };

    switch (action) {
      case "test": {
        const res = await fetch(`${GRAPH}/${cfg.phone_number_id}?fields=display_phone_number,verified_name`, { headers });
        const data = await res.json();
        return json({ ok: res.ok, data: res.ok ? data : undefined, error: res.ok ? undefined : data });
      }

      case "get_templates": {
        if (!cfg.waba_id) return json({ ok: false, error: "WABA ID não configurado" }, 400);
        const res = await fetch(`${GRAPH}/${cfg.waba_id}/message_templates?limit=100`, { headers });
        const data = await res.json();
        return json({ ok: res.ok, data });
      }

      case "send_template": {
        const to = String(body?.to || "").replace(/\D/g, "");
        const templateName = String(body?.template_name || "");
        const language = String(body?.language || "pt_BR");
        const params: string[] = Array.isArray(body?.params) ? body.params.map(String) : [];
        const buttonPayload: string | undefined = body?.button_payload;

        if (!to || to.length < 10) return json({ ok: false, error: "Número inválido" }, 400);
        if (!templateName) return json({ ok: false, error: "Template não informado" }, 400);

        const components: any[] = [];
        if (params.length > 0) {
          components.push({
            type: "body",
            parameters: params.map((text) => ({ type: "text", text })),
          });
        }
        if (buttonPayload) {
          components.push({
            type: "button",
            sub_type: "quick_reply",
            index: "0",
            parameters: [{ type: "payload", payload: buttonPayload }],
          });
        }

        const payload = {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: language },
            ...(components.length > 0 ? { components } : {}),
          },
        };

        const res = await fetch(`${GRAPH}/${cfg.phone_number_id}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        return json({ ok: res.ok, data, error: res.ok ? undefined : data }, res.ok ? 200 : 400);
      }

      case "send_text": {
        const to = String(body?.to || "").replace(/\D/g, "");
        const text = String(body?.text || "");
        if (!to || !text) return json({ ok: false, error: "Parâmetros inválidos" }, 400);
        const res = await fetch(`${GRAPH}/${cfg.phone_number_id}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text },
          }),
        });
        const data = await res.json();
        return json({ ok: res.ok, data, error: res.ok ? undefined : data }, res.ok ? 200 : 400);
      }

      default:
        return json({ ok: false, error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[whatsapp-meta] erro:", e);
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});

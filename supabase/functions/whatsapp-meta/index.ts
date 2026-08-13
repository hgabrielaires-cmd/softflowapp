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
    if (!cfg) return json({ ok: false, error: "Integração WhatsApp Meta não configurada" });

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
        if (!cfg.waba_id) return json({ ok: false, error: "WABA ID não configurado" });
        const res = await fetch(`${GRAPH}/${cfg.waba_id}/message_templates?limit=100`, { headers });
        const data = await res.json();
        return json({ ok: res.ok, data });
      }

      case "create_template": {
        if (!cfg.waba_id) return json({ ok: false, error: "WABA ID não configurado" });
        const name = String(body?.name || "").trim();
        const language = String(body?.language || "pt_BR");
        const categoriaRaw = String(body?.category || "").trim();
        const categoryMap: Record<string, string> = {
          "UTILITY": "UTILITY",
          "UTILITARIO": "UTILITY",
          "UTILITÁRIO": "UTILITY",
          "MARKETING": "MARKETING",
          "AUTHENTICATION": "AUTHENTICATION",
          "AUTENTICACAO": "AUTHENTICATION",
          "AUTENTICAÇÃO": "AUTHENTICATION",
        };
        const category = categoriaRaw ? (categoryMap[categoriaRaw.toUpperCase()] || "UTILITY") : "";
        // A Meta rejeita corpos com 3+ quebras de linha seguidas, espaços em excesso,
        // templates compostos apenas por variáveis ou mais de 10 emojis.
        const conteudo = String(body?.conteudo || "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .split("\n")
          .map((l) => l.trimEnd())
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]{2,}/g, " ")
          .trim();
        const buttons: any[] = Array.isArray(body?.buttons) ? body.buttons : [];

        const faltando: string[] = [];
        if (!name) faltando.push("nome do template na Meta");
        if (!category) faltando.push("tipo de template");
        if (!language) faltando.push("idioma");
        if (!conteudo) faltando.push("conteúdo");
        if (faltando.length) return json({ ok: false, error: `Campos obrigatórios: ${faltando.join(", ")}` });

        const examples: string[] = Array.isArray(body?.examples)
          ? body.examples.map((e: unknown) => String(e ?? "").trim()).filter((e: string) => e.length > 0)
          : [];
        const totalVars = new Set(
          [...conteudo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])),
        ).size;
        if (totalVars > 0 && examples.length < totalVars) {
          return json({
            ok: false,
            error: `A Meta exige um exemplo para cada variável (${totalVars} necessárias, ${examples.length} informadas).`,
          });
        }

        const bodyComponent: any = { type: "BODY", text: conteudo };
        if (totalVars > 0) {
          bodyComponent.example = { body_text: [examples.slice(0, totalVars)] };
        }
        const components: any[] = [bodyComponent];

        if (buttons.length > 0) {
          components.push({
            type: "BUTTONS",
            buttons: buttons.map((b: any) => {
              const tipo = b.type === "PHONE" ? "PHONE_NUMBER" : b.type;
              const btn: any = { type: tipo, text: b.text };
              if (tipo === "URL") btn.url = b.url;
              if (tipo === "PHONE_NUMBER") btn.phone_number = b.phone;
              return btn;
            }),
          });
        }

        const res = await fetch(`${GRAPH}/${cfg.waba_id}/message_templates`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name, language, category, components }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("[whatsapp-meta] create_template falhou:", JSON.stringify(data));
          return json({
            ok: false,
            error: data?.error?.error_user_msg || data?.error?.message || "Erro Meta",
            details: data,
          });
        }
        return json({ ok: true, template_id: data?.id, status: data?.status });
      }

      case "sync_templates": {
        if (!cfg.waba_id) return json({ ok: false, error: "WABA ID não configurado" });
        const res = await fetch(
          `${GRAPH}/${cfg.waba_id}/message_templates?fields=name,status,category,language&limit=100`,
          { headers },
        );
        const data = await res.json();
        if (!res.ok) return json({ ok: false, error: data?.error?.message || "Erro Meta" });

        const lista: any[] = Array.isArray(data?.data) ? data.data : [];
        const contagem = { approved: 0, pending: 0, rejected: 0, outros: 0 };
        for (const t of lista) {
          const status = String(t?.status || "").toLowerCase();
          if (status === "approved") contagem.approved++;
          else if (status === "rejected") contagem.rejected++;
          else if (status === "pending" || status === "in_appeal" || status === "pending_deletion") contagem.pending++;
          else contagem.outros++;
          const normalizado = status === "approved" || status === "rejected" ? status : "pending";
          await admin
            .from("message_templates")
            .update({ meta_template_status: normalizado })
            .eq("meta_template_name", t.name);
        }
        return json({ ok: true, total: lista.length, contagem });
      }



      case "send_template": {
        const numeroLimpo = String(body?.to || "").replace(/\D/g, "");
        const to = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
        const templateName = String(body?.template_name || "");
        const language = String(body?.language || "pt_BR");
        const params: string[] = Array.isArray(body?.params) ? body.params.map(String) : [];
        const buttonPayload: string | undefined = body?.button_payload;

        if (!numeroLimpo || numeroLimpo.length < 10) return json({ ok: false, error: "Número inválido" });
        if (!templateName) return json({ ok: false, error: "Template não informado" });

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

        console.log("[meta] Enviando template:", JSON.stringify({
          phone_number_id: cfg.phone_number_id,
          numero_destino: to,
          template_name: templateName,
          language,
          parametros: params,
          button_payload: buttonPayload,
        }));

        const res = await fetch(`${GRAPH}/${cfg.phone_number_id}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        console.log("[meta] Resposta Meta:", res.status, JSON.stringify(data));

        if (!res.ok) {
          console.error("[meta] ERRO send_template:", JSON.stringify(data));
          return json({
            ok: false,
            error: data?.error?.error_user_msg || data?.error?.message || "Erro Meta",
            code: data?.error?.code,
            details: data,
          });
        }
        return json({ ok: true, data, message_id: data?.messages?.[0]?.id });
      }

      case "send_text": {
        const to = String(body?.to || "").replace(/\D/g, "");
        const text = String(body?.text || "");
        if (!to || !text) return json({ ok: false, error: "Parâmetros inválidos" });
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
        return json({ ok: res.ok, data, error: res.ok ? undefined : (data?.error?.message || JSON.stringify(data)) });
      }

      default:
        return json({ ok: false, error: `Ação desconhecida: ${action}` });
    }
  } catch (e) {
    console.error("[whatsapp-meta] erro:", e);
    return json({ ok: false, error: String((e as Error).message ?? e) });
  }
});

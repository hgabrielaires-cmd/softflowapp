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

async function getConfig(
  admin: ReturnType<typeof createClient>,
  phoneNumberId?: string | null,
  conversaId?: string | null,
): Promise<MetaConfig | null> {
  let pnid = phoneNumberId || null;
  if (!pnid && conversaId) {
    const { data: c } = await admin.from("chat_conversas").select("meta_phone_number_id").eq("id", conversaId).maybeSingle();
    pnid = (c as any)?.meta_phone_number_id ?? null;
  }
  let q = admin.from("whatsapp_meta_numeros").select("*").eq("ativo", true);
  q = pnid ? q.eq("phone_number_id", pnid) : q.order("padrao", { ascending: false }).order("created_at");
  const { data: rows } = await q.limit(1);
  const n = (rows as any)?.[0];
  if (n?.access_token) return { phone_number_id: n.phone_number_id, waba_id: n.waba_id, access_token: n.access_token, verify_token: "", phone_number: n.phone_number };
  const { data } = await admin
    .from("integracoes_config")
    .select("config")
    .eq("nome", "whatsapp_meta")
    .maybeSingle();
  const cfg = (data as any)?.config;
  if (!cfg?.access_token || !cfg?.phone_number_id) return null;
  return cfg as MetaConfig;
}

const META_APP_ID = "2182059352731360";

async function conectarNumero(admin: ReturnType<typeof createClient>, body: any) {
  const code = String(body?.code || "");
  const phoneNumberId = String(body?.phone_number_id || "");
  const wabaId = String(body?.waba_id || "");
  const apelido = String(body?.apelido || "").trim();
  const coexistencia = body?.coexistencia !== false;
  if (!code || !phoneNumberId || !wabaId || !apelido) return json({ ok: false, error: "Dados da conexão incompletos" }, 400);
  const secret = Deno.env.get("META_APP_SECRET");
  if (!secret) return json({ ok: false, error: "META_APP_SECRET não configurado" });

  const tokenRes = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({ client_id: META_APP_ID, client_secret: secret, code }));
  const tokenData = await tokenRes.json();
  const accessToken = tokenData?.access_token;
  if (!accessToken) return json({ ok: false, error: "A Meta recusou o código", detail: tokenData });
  const h = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  // Inscreve o app nos webhooks da conta
  const sub = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, { method: "POST", headers: h }).then((r) => r.json()).catch((e) => ({ error: String(e) }));

  // Coexistência: não registra o número; inicia sincronização de contatos e histórico
  const sync: Record<string, unknown> = {};
  if (coexistencia) {
    for (const t of ["smb_app_state_sync", "history"]) {
      sync[t] = await fetch(`${GRAPH}/${phoneNumberId}/smb_app_data`, {
        method: "POST", headers: h, body: JSON.stringify({ messaging_product: "whatsapp", sync_type: t }),
      }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    }
  } else {
    sync.register = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
      method: "POST", headers: h, body: JSON.stringify({ messaging_product: "whatsapp", pin: String(Math.floor(100000 + Math.random() * 900000)) }),
    }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  }

  const info = await fetch(`${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name`, { headers: h }).then((r) => r.json()).catch(() => ({}));

  if (body?.padrao) await admin.from("whatsapp_meta_numeros").update({ padrao: false }).neq("phone_number_id", phoneNumberId);
  const { error } = await admin.from("whatsapp_meta_numeros").upsert({
    phone_number_id: phoneNumberId, waba_id: wabaId, access_token: accessToken, apelido,
    filial_id: body?.filial_id || null, padrao: !!body?.padrao, ativo: true, coexistencia,
    phone_number: info?.display_phone_number ?? null, display_name: info?.verified_name ?? null, status: "connected",
  }, { onConflict: "phone_number_id" });
  if (error) return json({ ok: false, error: error.message });
  console.log("[meta] número conectado", phoneNumberId, JSON.stringify({ sub, sync }));
  return json({ ok: true, phone_number: info?.display_phone_number, display_name: info?.verified_name, subscribed: sub, sync });
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
    if (action === "connect_number") {
      const { data: isAdm } = await anon.rpc("is_admin", { _user_id: claimsData.claims.sub });
      if (!isAdm) return json({ ok: false, error: "Apenas administradores" }, 403);
      return await conectarNumero(admin, body);
    }
    const cfg = await getConfig(admin, body?.phone_number_id, body?.conversa_id);
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

      case "send_media": {
        const numeroLimpo = String(body?.to || "").replace(/\D/g, "");
        const to = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
        const link = String(body?.link || "");
        const caption = body?.caption ? String(body.caption) : undefined;
        const filename = body?.filename ? String(body.filename) : "arquivo";
        const raw = String(body?.mediatype || "document");
        const tipo = ["image", "video", "audio", "document"].includes(raw) ? raw : "document";

        if (!numeroLimpo || numeroLimpo.length < 10) return json({ ok: false, error: "Número inválido" });
        if (!link.startsWith("http")) return json({ ok: false, error: "Link da mídia inválido" });

        const media: Record<string, unknown> = { link };
        if (tipo !== "audio" && caption) media.caption = caption;
        if (tipo === "document") media.filename = filename;

        const res = await fetch(`${GRAPH}/${cfg.phone_number_id}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: tipo,
            [tipo]: media,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("[meta] ERRO send_media:", JSON.stringify(data));
          return json({
            ok: false,
            error: data?.error?.error_user_msg || data?.error?.message || "Erro Meta",
            details: data,
          });
        }
        return json({ ok: true, message_id: data?.messages?.[0]?.id });
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

      case "test_send": {
        const numeroLimpo = String(body?.numero || "5584994561994").replace(/\D/g, "");
        const to = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
        const res = await fetch(`${GRAPH}/${cfg.phone_number_id}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: String(body?.template_name || "chat_conversa_ativa_v2"),
              language: { code: String(body?.language || "pt_BR") },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: "TESTE" },
                    { type: "text", text: "bom dia" },
                    { type: "text", text: "Gabriel" },
                  ],
                },
              ],
            },
          }),
        });
        const data = await res.json();
        console.log("[meta] test_send resultado:", res.status, JSON.stringify(data));
        return json({ status: res.status, ok: res.ok, data });
      }

      case "phone_info": {
        const res = await fetch(
          `${GRAPH}/${cfg.phone_number_id}?fields=verified_name,code_verification_status,quality_rating,display_phone_number,throughput,status`,
          { headers },
        );
        const data = await res.json();
        console.log("[meta] phone_info:", res.status, JSON.stringify(data));
        return json({ status: res.status, ok: res.ok, data });
      }

      default:
        return json({ ok: false, error: `Ação desconhecida: ${action}` });

    }
  } catch (e) {
    console.error("[whatsapp-meta] erro:", e);
    return json({ ok: false, error: String((e as Error).message ?? e) });
  }
});

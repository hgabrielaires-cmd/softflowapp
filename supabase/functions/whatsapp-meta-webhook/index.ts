import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function getConfig() {
  const { data } = await admin
    .from("integracoes_config")
    .select("config")
    .eq("nome", "whatsapp_meta")
    .maybeSingle();
  return ((data as any)?.config ?? {}) as Record<string, string>;
}

async function acharConversa(numero: string) {
  const { data } = await admin
    .from("chat_conversas")
    .select("id, status, atendente_id, nome_cliente, iniciado_em")
    .eq("numero_cliente", numero)
    .eq("canal", "whatsapp_meta")
    .neq("status", "encerrado")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

async function jaProcessada(messageId: string | null) {
  if (!messageId) return false;
  const { data } = await admin
    .from("chat_mensagens")
    .select("id")
    .eq("evolution_message_id", messageId)
    .maybeSingle();
  return !!data;
}

async function salvarMensagem(
  conversaId: string,
  conteudo: string,
  tipo = "texto",
  extra: Record<string, unknown> = {},
) {
  await admin.from("chat_mensagens").insert({
    conversa_id: conversaId,
    tipo,
    conteudo,
    remetente: "cliente",
    ...extra,
  });
  await admin.from("chat_conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversaId);
}

/** Cliente respondeu: ativa o atendimento direto com o atendente que enviou o template. */
async function ativarAtendimento(conversa: any, nome: string | null, numero: string) {
  // Só ativa automaticamente conversas iniciadas por template (têm atendente dono)
  if (conversa.status !== "aguardando_cliente" || !conversa.atendente_id) return;
  const agora = new Date();
  const iniciado = conversa.iniciado_em ? new Date(conversa.iniciado_em) : null;
  const espera = iniciado ? Math.max(0, Math.round((agora.getTime() - iniciado.getTime()) / 1000)) : null;

  const update: Record<string, unknown> = {
    status: "em_atendimento",
    atendimento_iniciado_em: agora.toISOString(),
    updated_at: agora.toISOString(),
  };
  if (espera !== null) update.tempo_espera_segundos = espera;

  await admin.from("chat_conversas").update(update).eq("id", conversa.id);

  // Sai da fila, se por algum motivo estiver enfileirada
  await admin.from("chat_fila").delete().eq("conversa_id", conversa.id);

  await admin.from("chat_mensagens").insert({
    conversa_id: conversa.id,
    tipo: "sistema",
    conteudo: "Cliente respondeu — atendimento iniciado automaticamente",
    remetente: "sistema",
  });

  if (conversa.atendente_id) {
    await admin.from("notificacoes").insert({
      destinatario_user_id: conversa.atendente_id,
      criado_por: conversa.atendente_id,
      titulo: "💬 Cliente aceitou o atendimento",
      mensagem: `${nome || conversa.nome_cliente || numero} respondeu e está pronto para ser atendido`,
      tipo: "chat",
      metadata: { conversa_id: conversa.id, link: "/chat" },
    });
  }
}

/** Compara a assinatura HMAC-SHA256 enviada pela Meta com o corpo bruto recebido. */
async function validSignature(appSecret: string, rawBody: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const received = signature.slice("sha256=".length).toLowerCase();
    if (received.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("[whatsapp-meta-webhook] erro ao validar assinatura:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // ── GET: verificação do webhook Meta ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    const cfg = await getConfig().catch(() => ({} as Record<string, string>));
    const envToken = Deno.env.get("WHATSAPP_META_VERIFY_TOKEN") ?? "";
    const valid = token && (token === cfg.verify_token || (envToken && token === envToken));
    if (mode === "subscribe" && valid) {
      return new Response(challenge, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // ── POST: eventos ──
  try {
    // Validação HMAC-SHA256 (X-Hub-Signature-256) — FAIL CLOSED
    const rawBody = await req.text();
    const cfgPost = await getConfig().catch(() => ({} as Record<string, string>));
    const appSecret = Deno.env.get("META_APP_SECRET") || cfgPost.app_secret || "";
    const signature = req.headers.get("x-hub-signature-256") || "";
    if (!appSecret || !signature.startsWith("sha256=") || !(await validSignature(appSecret, rawBody, signature))) {
      console.warn("[whatsapp-meta-webhook] assinatura inválida ou ausente");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const body = JSON.parse(rawBody);
    console.log("[whatsapp-meta-webhook] evento:", JSON.stringify(body).slice(0, 2000));

    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};

        // Status de entrega
        for (const st of value?.statuses ?? []) {
          console.log("[whatsapp-meta-webhook] status:", st.id, st.status);
        }

        // Mensagens recebidas
        for (const msg of value?.messages ?? []) {
          const numero = String(msg.from || "").replace(/\D/g, "");
          if (!numero) continue;
          const nome = value?.contacts?.[0]?.profile?.name ?? null;
          const wamid: string | null = msg?.id ?? null;

          // Deduplicação — a Meta reenvia o mesmo evento várias vezes
          if (await jaProcessada(wamid)) {
            console.log("[whatsapp-meta-webhook] mensagem já processada:", wamid);
            continue;
          }

          let conversa = await acharConversa(numero);
          if (!conversa) {
            const agora = new Date().toISOString();
            const { data: nova } = await admin
              .from("chat_conversas")
              .insert({
                numero_cliente: numero,
                nome_cliente: nome,
                canal: "whatsapp_meta",
                status: "aguardando",
                iniciado_em: agora,
                updated_at: agora,
              })
              .select("id, status, atendente_id, nome_cliente, iniciado_em")
              .single();
            conversa = nova as any;
          }
          if (!conversa) continue;

          // Texto da mensagem (texto simples ou resposta de botão)
          let texto = "";
          let tipo = "texto";
          const extra: Record<string, unknown> = { evolution_message_id: wamid };

          if (msg.type === "interactive" || msg.type === "button") {
            texto =
              msg?.interactive?.button_reply?.title ??
              msg?.button?.text ??
              msg?.interactive?.button_reply?.id ??
              msg?.button?.payload ??
              "";
          } else if (msg.type === "text") {
            texto = msg?.text?.body ?? "";
          } else if (["image", "audio", "document", "video"].includes(msg.type)) {
            texto = `[${msg.type}]`;
            tipo = msg.type;
            extra.media_tipo = msg.type;
            extra.media_nome = msg?.[msg.type]?.filename ?? null;
          } else {
            continue;
          }

          await salvarMensagem(conversa.id, texto, tipo, extra);

          // Qualquer resposta do cliente ativa o atendimento com o atendente dono da conversa
          await ativarAtendimento(conversa, nome, numero);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[whatsapp-meta-webhook] erro:", e);
    // Sempre 200 para a Meta não reenviar em loop
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

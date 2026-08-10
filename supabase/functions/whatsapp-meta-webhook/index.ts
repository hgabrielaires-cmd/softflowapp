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
    .select("id, status, atendente_id")
    .eq("numero_cliente", numero)
    .eq("canal", "whatsapp_meta")
    .neq("status", "encerrado")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

async function salvarMensagem(conversaId: string, conteudo: string, tipo = "texto", extra: Record<string, unknown> = {}) {
  await admin.from("chat_mensagens").insert({
    conversa_id: conversaId,
    tipo,
    conteudo,
    remetente: "cliente",
    ...extra,
  });
  await admin.from("chat_conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversaId);
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
    const body = await req.json();
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
              .select("id, status, atendente_id")
              .single();
            conversa = nova as any;
          }
          if (!conversa) continue;

          // Resposta de botão interativo
          if (msg.type === "interactive" || msg.type === "button") {
            const payload =
              msg?.interactive?.button_reply?.id ??
              msg?.button?.payload ??
              msg?.button?.text ??
              "";
            const texto =
              msg?.interactive?.button_reply?.title ??
              msg?.button?.text ??
              payload;

            await salvarMensagem(conversa.id, texto, "texto");

            if (String(payload).toUpperCase().includes("INICIAR_CONVERSA")) {
              await admin
                .from("chat_conversas")
                .update({
                  status: "em_atendimento",
                  atendimento_iniciado_em: new Date().toISOString(),
                })
                .eq("id", conversa.id);

              await admin.from("chat_mensagens").insert({
                conversa_id: conversa.id,
                tipo: "sistema",
                conteudo: "Cliente aceitou iniciar a conversa",
                remetente: "sistema",
              });

              if (conversa.atendente_id) {
                await admin.from("notificacoes").insert({
                  destinatario_user_id: conversa.atendente_id,
                  criado_por: conversa.atendente_id,
                  titulo: "Cliente iniciou a conversa",
                  mensagem: `${nome || numero} clicou em "Iniciar Conversa" no WhatsApp.`,
                  tipo: "chat",
                  metadata: { conversa_id: conversa.id, link: "/chat" },
                });
              }
            }
            continue;
          }

          if (msg.type === "text") {
            await salvarMensagem(conversa.id, msg?.text?.body ?? "");
          } else if (["image", "audio", "document", "video"].includes(msg.type)) {
            await salvarMensagem(conversa.id, `[${msg.type}]`, msg.type, {
              media_tipo: msg.type,
              media_nome: msg?.[msg.type]?.filename ?? null,
            });
          }
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

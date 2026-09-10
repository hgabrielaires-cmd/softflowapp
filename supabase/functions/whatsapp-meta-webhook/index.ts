import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizarNumero } from "../_shared/telefone.ts";

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
    .in("numero_cliente", normalizarNumero(numero))
    .eq("canal", "whatsapp_meta")
    .neq("status", "encerrado")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/** Conversa encerrada nas últimas 24h com NPS enviado e ainda sem nota. */
async function acharNpsPendente(numero: string) {
  const { data } = await admin
    .from("chat_conversas")
    .select("id, nps_enviado, nps_nota, canal")
    .in("numero_cliente", normalizarNumero(numero))
    .eq("status", "encerrado")
    .eq("nps_enviado", true)
    .is("nps_nota", null)
    .gte("encerrado_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("encerrado_em", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/** Envia texto simples pela Cloud API da Meta. */
async function enviarTexto(numero: string, texto: string) {
  try {
    const cfg = await getConfig();
    if (!cfg?.access_token || !cfg?.phone_number_id) {
      console.error("[whatsapp-meta-webhook] credenciais Meta ausentes");
      return;
    }
    const digits = (numero || "").replace(/\D/g, "");
    const to = digits.startsWith("55") ? digits : `55${digits}`;
    const res = await fetch(`https://graph.facebook.com/v19.0/${cfg.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: texto },
      }),
    });
    if (!res.ok) console.error("[whatsapp-meta-webhook] falha ao enviar:", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error("[whatsapp-meta-webhook] erro ao enviar texto:", e);
  }
}

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/amr": "amr",
  "application/pdf": "pdf",
};

/** Baixa a mídia da Meta e guarda no bucket chat-midias, devolvendo a URL do objeto. */
async function processarMidiaMeta(
  mediaId: string,
  mimeType: string,
  conversaId: string,
): Promise<string | null> {
  try {
    const cfg = await getConfig();
    const accessToken = cfg?.access_token;
    if (!accessToken) {
      console.error("[meta-media] access_token ausente");
      return null;
    }

    const infoRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const info = await infoRes.json();
    const mediaUrl = info?.url;
    if (!mediaUrl) {
      console.error("[meta-media] URL não encontrada para", mediaId);
      return null;
    }

    const mediaRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) {
      console.error("[meta-media] erro no download:", mediaRes.status);
      return null;
    }
    const buffer = await mediaRes.arrayBuffer();

    const ext = EXT_MAP[mimeType] || mimeType?.split("/")[1]?.split(";")[0] || "bin";
    const path = `${conversaId}/${Date.now()}.${ext}`;

    const { error } = await admin.storage
      .from("chat-midias")
      .upload(path, buffer, { contentType: mimeType, upsert: false });
    if (error) {
      console.error("[meta-media] erro no storage:", error.message);
      return null;
    }

    const { data: urlData } = admin.storage.from("chat-midias").getPublicUrl(path);
    console.log("[meta-media] ✅ salvo:", path);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[meta-media] exceção:", err);
    return null;
  }
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

          // Texto da mensagem (texto simples ou resposta de botão)
          let texto = "";
          let tipo = "texto";
          let mediaId: string | null = null;
          let mediaTipo: string | null = null;
          let mediaNome: string | null = null;
          const extra: Record<string, unknown> = { evolution_message_id: wamid };

          switch (msg.type) {
            case "interactive":
            case "button":
              texto =
                msg?.interactive?.button_reply?.title ??
                msg?.interactive?.list_reply?.title ??
                msg?.button?.text ??
                msg?.interactive?.button_reply?.id ??
                msg?.button?.payload ??
                "";
              break;
            case "text":
              texto = msg?.text?.body ?? "";
              break;
            case "image":
              tipo = "imagem";
              texto = msg?.image?.caption ?? "";
              mediaTipo = msg?.image?.mime_type ?? "image/jpeg";
              mediaId = msg?.image?.id ?? null;
              break;
            case "sticker":
              tipo = "imagem";
              mediaTipo = msg?.sticker?.mime_type ?? "image/webp";
              mediaId = msg?.sticker?.id ?? null;
              break;
            case "video":
              tipo = "video";
              texto = msg?.video?.caption ?? "";
              mediaTipo = msg?.video?.mime_type ?? "video/mp4";
              mediaId = msg?.video?.id ?? null;
              break;
            case "audio":
              tipo = "audio";
              mediaTipo = msg?.audio?.mime_type ?? "audio/ogg";
              mediaId = msg?.audio?.id ?? null;
              break;
            case "document":
              tipo = "documento";
              texto = msg?.document?.caption ?? "";
              mediaNome = msg?.document?.filename ?? "documento";
              mediaTipo = msg?.document?.mime_type ?? "application/octet-stream";
              mediaId = msg?.document?.id ?? null;
              break;
            default:
              continue;
          }

          if (mediaTipo) extra.media_tipo = mediaTipo;
          if (mediaNome) extra.media_nome = mediaNome;

          // 1º) Conversa ativa (inclui aguardando_cliente) → só adiciona a mensagem
          let conversa = await acharConversa(numero);

          if (!conversa) {
            // 2º) NPS pendente nas últimas 24h → registra a nota, sem abrir conversa nova
            const conversaNps = await acharNpsPendente(numero);
            if (conversaNps) {
              const textoMsg = (texto || "").trim();
              const notaTexto = parseInt(textoMsg[0]);
              const tituloBotao = msg?.interactive?.button_reply?.title ?? msg?.button?.text ?? null;
              const notaBotao = tituloBotao ? parseInt(String(tituloBotao).trim()[0]) : NaN;
              const notaFinal =
                notaTexto >= 1 && notaTexto <= 5
                  ? notaTexto
                  : notaBotao >= 1 && notaBotao <= 5
                    ? notaBotao
                    : null;

              await admin.from("chat_mensagens").insert({
                conversa_id: conversaNps.id,
                tipo,
                conteudo: textoMsg,
                remetente: "cliente",
                ...extra,
              });

              if (notaFinal) {
                await admin
                  .from("chat_conversas")
                  .update({ nps_nota: notaFinal, nps_comentario: textoMsg })
                  .eq("id", conversaNps.id);

                const agradecimento =
                  "Obrigado pela sua avaliação! 🙏\nSua opinião é muito importante para nós. 😊";
                await enviarTexto(numero, agradecimento);
                await admin.from("chat_mensagens").insert({
                  conversa_id: conversaNps.id,
                  tipo: "bot",
                  conteudo: agradecimento,
                  remetente: "bot",
                });
                console.log("[whatsapp-meta-webhook] NPS registrado:", notaFinal, conversaNps.id);
              } else {
                const reenvio = "Por favor, responda apenas com um número de 1 a 5. 😊";
                await enviarTexto(numero, reenvio);
                await admin.from("chat_mensagens").insert({
                  conversa_id: conversaNps.id,
                  tipo: "bot",
                  conteudo: reenvio,
                  remetente: "bot",
                });
                console.log("[whatsapp-meta-webhook] resposta de NPS inválida:", conversaNps.id);
              }
              continue;
            }

            // 3º) Nada pendente → nova conversa na fila
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

          if (mediaId && mediaTipo) {
            extra.media_url = await processarMidiaMeta(mediaId, mediaTipo, conversa.id);
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

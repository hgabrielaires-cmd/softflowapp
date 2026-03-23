import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 to avoid Evolution API retries
  const ok = (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Ping for health check
    if (action === "ping") {
      return ok({ ok: true, timestamp: new Date().toISOString() });
    }

    // Token validation
    const expectedToken = Deno.env.get("EVOLUTION_WEBHOOK_TOKEN");
    const receivedToken =
      url.searchParams.get("token") ||
      req.headers.get("x-webhook-token") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!expectedToken || receivedToken !== expectedToken) {
      console.error("[evolution-webhook] Token inválido ou ausente");
      return ok({ error: "token_invalid" });
    }

    if (req.method !== "POST") {
      return ok({ error: "method_not_allowed" });
    }

    const body = await req.json();
    console.log("[evolution-webhook] Evento recebido:", body.event, "Instância:", body.instance);

    // Only process incoming messages
    if (body.event !== "messages.upsert") {
      return ok({ ignored: true, reason: "event_not_messages_upsert" });
    }

    const data = body.data;
    if (!data?.key || data.key.fromMe) {
      return ok({ ignored: true, reason: "from_me_or_no_key" });
    }

    // Ignore group messages
    const remoteJid = data.key.remoteJid || "";
    if (remoteJid.endsWith("@g.us")) {
      return ok({ ignored: true, reason: "group_message" });
    }

    // Extract message data
    const numero = remoteJid.replace("@s.whatsapp.net", "");
    const nome = data.pushName || "";
    const instancia = body.instance || "";
    const evolutionMessageId = data.key.id || "";

    // Extract text/media
    const msg = data.message || {};
    let tipo = "texto";
    let conteudo = "";
    let mediaUrl = "";
    let mediaTipo = "";
    let mediaNome = "";

    if (msg.conversation) {
      conteudo = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      conteudo = msg.extendedTextMessage.text;
    } else if (msg.imageMessage) {
      tipo = "imagem";
      conteudo = msg.imageMessage.caption || "";
      mediaTipo = msg.imageMessage.mimetype || "image/jpeg";
      mediaUrl = msg.imageMessage.url || "";
    } else if (msg.audioMessage) {
      tipo = "audio";
      mediaTipo = msg.audioMessage.mimetype || "audio/ogg";
      mediaUrl = msg.audioMessage.url || "";
    } else if (msg.documentMessage) {
      tipo = "documento";
      mediaNome = msg.documentMessage.fileName || "documento";
      mediaTipo = msg.documentMessage.mimetype || "application/octet-stream";
      mediaUrl = msg.documentMessage.url || "";
      conteudo = msg.documentMessage.caption || "";
    } else if (msg.videoMessage) {
      tipo = "imagem";
      mediaTipo = msg.videoMessage.mimetype || "video/mp4";
      mediaUrl = msg.videoMessage.url || "";
      conteudo = msg.videoMessage.caption || "";
    } else {
      // Unknown message type - save raw
      conteudo = JSON.stringify(msg).substring(0, 500);
    }

    // Service role client for DB operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Download media from Evolution API and persist to Supabase Storage
    async function salvarMidiaStorage(
      origUrl: string,
      conversaId: string,
      fileName: string,
      mimeType: string
    ): Promise<string> {
      try {
        if (!origUrl) return "";
        console.log("[evolution-webhook] Baixando mídia:", origUrl.substring(0, 120));
        const response = await fetch(origUrl);
        if (!response.ok) {
          console.error("[evolution-webhook] Falha ao baixar mídia:", response.status);
          return origUrl;
        }
        const buffer = await response.arrayBuffer();
        const timestamp = Date.now();
        const safeName = (fileName || "media").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${conversaId}/${timestamp}_${safeName}`;

        const { error } = await supabase.storage
          .from("chat-midias")
          .upload(path, buffer, { contentType: mimeType, upsert: false });

        if (error) {
          console.error("[evolution-webhook] Erro upload storage:", error.message);
          return origUrl;
        }

        const { data: urlData } = supabase.storage
          .from("chat-midias")
          .getPublicUrl(path);

        console.log("[evolution-webhook] Mídia salva no storage:", urlData.publicUrl.substring(0, 100));
        return urlData.publicUrl;
      } catch (e) {
        console.error("[evolution-webhook] Erro salvarMidiaStorage:", e);
        return origUrl;
      }
    }

    // Find active conversation for this number
    const { data: conversa } = await supabase
      .from("chat_conversas")
      .select("*")
      .eq("numero_cliente", numero)
      .not("status", "in", '("encerrado","fora_horario")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load chat config (for the instance's filial or default)
    const { data: config } = await supabase
      .from("chat_configuracoes")
      .select("*")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    // Load WhatsApp integration config for sending replies
    const { data: whatsappConfig } = await supabase
      .from("integracoes_config")
      .select("server_url, token")
      .eq("nome", "whatsapp")
      .eq("ativo", true)
      .maybeSingle();

    // Helper to send WhatsApp message via Evolution API
    async function sendWhatsApp(text: string, instanceName?: string) {
      if (!whatsappConfig?.server_url || !whatsappConfig?.token) {
        console.error("[evolution-webhook] WhatsApp config not found, cannot send reply");
        return;
      }
      const baseUrl = whatsappConfig.server_url.replace(/\/+$/, "");
      const name = instanceName || instancia || "Softflow_WhatsApp";
      try {
        await fetch(`${baseUrl}/message/sendText/${name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: whatsappConfig.token },
          body: JSON.stringify({ number: numero, text }),
        });
      } catch (e) {
        console.error("[evolution-webhook] Erro ao enviar WhatsApp:", e);
      }
    }

    if (conversa) {
      // ── Existing conversation ──
      // Save message
      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa.id,
        tipo,
        conteudo,
        media_url: mediaUrl || null,
        media_tipo: mediaTipo || null,
        media_nome: mediaNome || null,
        remetente: "cliente",
        evolution_message_id: evolutionMessageId,
      });

      // Update conversation timestamp
      await supabase
        .from("chat_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversa.id);

      // Handle NPS response for recently closed conversations
      if (conversa.nps_enviado && !conversa.nps_nota && conteudo) {
        const nota = parseInt(conteudo.trim());
        if (nota >= 1 && nota <= 5) {
          await supabase
            .from("chat_conversas")
            .update({ nps_nota: nota, nps_comentario: conteudo })
            .eq("id", conversa.id);
          await sendWhatsApp("Obrigado pela sua avaliação! 🙏", conversa.canal_instancia);
        }
      }

      // If conversation is in bot mode, process bot flow
      if (conversa.status === "bot") {
        await processBot(supabase, conversa, conteudo, config, sendWhatsApp);
      }

      return ok({ success: true, conversa_id: conversa.id, action: "message_added" });
    }

    // ── New conversation ──
    // Check business hours (dual-period: atendimento + plantão)
    const agora = new Date();
    const brasilOffset = -3;
    const utcHours = agora.getUTCHours();
    const brasilHour = (utcHours + brasilOffset + 24) % 24;
    const brasilMinute = agora.getUTCMinutes();
    const currentTime = brasilHour * 60 + brasilMinute;
    // Calculate day-of-week in Brazil timezone
    const brasilMs = agora.getTime() + brasilOffset * 3600000;
    const brasilDate = new Date(brasilMs);
    const diaSemana = brasilDate.getUTCDay(); // 0=Sun..6=Sat

    function timeToMin(t: string): number {
      const [h, m] = (t || "00:00").split(":").map(Number);
      return h * 60 + (m || 0);
    }

    let modo: "atendimento" | "plantao" | "fora" = "fora";
    if (config) {
      const horarios = (config as any).horarios_por_dia;
      if (horarios && horarios[String(diaSemana)]) {
        const dia = horarios[String(diaSemana)];
        // Check atendimento first (higher priority)
        if (dia.atendimento?.ativo && dia.atendimento.inicio && dia.atendimento.fim) {
          const ini = timeToMin(dia.atendimento.inicio);
          const fim = timeToMin(dia.atendimento.fim);
          if (currentTime >= ini && currentTime < fim) {
            modo = "atendimento";
          }
        }
        // Then check plantão
        if (modo === "fora" && dia.plantao?.ativo && dia.plantao.inicio && dia.plantao.fim) {
          const ini = timeToMin(dia.plantao.inicio);
          const fim = timeToMin(dia.plantao.fim);
          if (currentTime >= ini && currentTime <= fim) {
            modo = "plantao";
          }
        }
      } else {
        // Fallback to legacy fields
        const [hIni, mIni] = (config.horario_inicio || "08:00").split(":").map(Number);
        const [hFim, mFim] = (config.horario_fim || "23:59").split(":").map(Number);
        const inicio = hIni * 60 + mIni;
        const fim = hFim * 60 + mFim;
        const diasPermitidos = config.dias_semana || [1, 2, 3, 4, 5, 6];
        if (currentTime >= inicio && currentTime <= fim && diasPermitidos.includes(diaSemana)) {
          modo = "atendimento";
        }
      }
    } else {
      modo = "atendimento"; // No config = always open
    }

    // Generate protocol
    const hoje = agora.toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("chat_conversas")
      .select("id", { count: "exact", head: true })
      .gte("created_at", agora.toISOString().slice(0, 10));
    const seq = ((count || 0) + 1).toString().padStart(3, "0");
    const protocolo = `#${hoje}${seq}`;

    if (modo === "fora") {
      // Out of business hours
      const { data: novaConversa } = await supabase
        .from("chat_conversas")
        .insert({
          protocolo,
          canal: "whatsapp",
          status: "fora_horario",
          numero_cliente: numero,
          nome_cliente: nome,
          canal_instancia: instancia,
        })
        .select("id")
        .single();

      if (novaConversa) {
        await supabase.from("chat_mensagens").insert({
          conversa_id: novaConversa.id,
          tipo,
          conteudo,
          media_url: mediaUrl || null,
          media_tipo: mediaTipo || null,
          media_nome: mediaNome || null,
          remetente: "cliente",
          evolution_message_id: evolutionMessageId,
        });

        const msgFora = (config?.mensagem_fora_horario || "Olá! Estamos fora do horário de atendimento. Retornaremos em breve!")
          .replace("{horario_inicio}", config?.horario_inicio || "08:00")
          .replace("{horario_fim}", config?.horario_fim || "18:00");
        await sendWhatsApp(msgFora);

        await supabase.from("chat_mensagens").insert({
          conversa_id: novaConversa.id,
          tipo: "bot",
          conteudo: msgFora,
          remetente: "bot",
        });
      }

      return ok({ success: true, action: "fora_horario" });
    }

    // Plantão prefix message (prepended to welcome)
    const plantaoPrefix = modo === "plantao"
      ? ((config as any)?.mensagem_plantao || "🚨 *Atenção: Estamos em regime de plantão.* Atendemos apenas casos emergenciais neste horário. Descreva sua situação e retornaremos o mais breve possível.") + "\n\n"
      : "";

    // Within business hours or plantão - create conversation in bot mode
    const { data: novaConversa } = await supabase
      .from("chat_conversas")
      .insert({
        protocolo,
        canal: "whatsapp",
        status: "bot",
        numero_cliente: numero,
        nome_cliente: nome,
        canal_instancia: instancia,
        bot_estado: { passo: 0, respostas: {} },
      })
      .select("id")
      .single();

    if (!novaConversa) {
      console.error("[evolution-webhook] Erro ao criar conversa");
      return ok({ error: "failed_to_create_conversation" });
    }

    // Save original message
    await supabase.from("chat_mensagens").insert({
      conversa_id: novaConversa.id,
      tipo,
      conteudo,
      media_url: mediaUrl || null,
      media_tipo: mediaTipo || null,
      media_nome: mediaNome || null,
      remetente: "cliente",
      evolution_message_id: evolutionMessageId,
    });

    // Start bot flow
    const { data: fluxo } = await supabase
      .from("chat_bot_fluxo")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (!fluxo || fluxo.length === 0) {
      // No bot flow configured - go straight to queue
      const msgBV = config?.mensagem_boas_vindas || "Olá! Bem-vindo(a)! 😊";
      const msgAg = config?.mensagem_aguardando || "Aguarde, nossa equipe já vai lhe atender. 🤗";
      const textoFull = `${plantaoPrefix}${msgBV}\n\n${msgAg}`;
      await sendWhatsApp(textoFull);

      await supabase.from("chat_mensagens").insert({
        conversa_id: novaConversa.id,
        tipo: "bot",
        conteudo: textoFull,
        remetente: "bot",
      });

      await supabase
        .from("chat_conversas")
        .update({ status: "aguardando", nome_cliente: nome || "Cliente" })
        .eq("id", novaConversa.id);

      await supabase.from("chat_fila").insert({
        conversa_id: novaConversa.id,
        status: "aguardando",
      });

      return ok({ success: true, action: "straight_to_queue" });
    }

    // Send welcome + first question
    const msgBV = config?.mensagem_boas_vindas || "Olá! Bem-vindo(a)! 😊";
    const primeiraPergunta = fluxo[0].pergunta;
    let textoEnviar = `${plantaoPrefix}${msgBV}\n\n${primeiraPergunta}`;

    if (fluxo[0].tipo === "opcoes" && fluxo[0].opcoes) {
      const opcoes = fluxo[0].opcoes as Array<{ numero: number; texto: string }>;
      textoEnviar += "\n\n" + opcoes.map((o) => `${o.numero} - ${o.texto}`).join("\n");
    }

    await sendWhatsApp(textoEnviar);
    await supabase.from("chat_mensagens").insert({
      conversa_id: novaConversa.id,
      tipo: "bot",
      conteudo: textoEnviar,
      remetente: "bot",
    });

    await supabase
      .from("chat_conversas")
      .update({
        bot_estado: {
          passo: 1,
          respostas: {},
          aguardando_campo: fluxo[0].campo_destino || null,
        },
      })
      .eq("id", novaConversa.id);

    return ok({ success: true, action: "bot_started", conversa_id: novaConversa.id });
  } catch (err) {
    console.error("[evolution-webhook] Erro:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Bot Flow Processor ──────────────────────────────────────────────────────
async function processBot(
  supabase: ReturnType<typeof createClient>,
  conversa: any,
  resposta: string,
  config: any,
  sendWhatsApp: (text: string, instance?: string) => Promise<void>
) {
  const botEstado = (conversa.bot_estado as any) || { passo: 1, respostas: {} };
  const passoAtual = botEstado.passo || 1;

  const { data: fluxo } = await supabase
    .from("chat_bot_fluxo")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (!fluxo || fluxo.length === 0) return;

  const stepIndex = passoAtual - 1;
  if (stepIndex < 0 || stepIndex >= fluxo.length) return;

  const step = fluxo[stepIndex];
  const updates: Record<string, any> = {};
  const novasRespostas = { ...botEstado.respostas };

  // Process response based on step type
  if (step.tipo === "opcoes" && step.opcoes) {
    const opcoes = step.opcoes as Array<{ numero: number; texto: string; setor_id?: string }>;
    const escolha = parseInt(resposta.trim());
    const opcaoEscolhida = opcoes.find((o) => o.numero === escolha);

    if (!opcaoEscolhida) {
      await sendWhatsApp("Por favor, digite apenas o número da opção desejada.", conversa.canal_instancia);
      return;
    }

    novasRespostas[step.campo_destino || `step_${passoAtual}`] = opcaoEscolhida.texto;
    if (step.campo_destino === "setor_id" && opcaoEscolhida.setor_id) {
      updates.setor_id = opcaoEscolhida.setor_id;
    }
  } else if (step.tipo === "cnpj") {
    const cnpjLimpo = resposta.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14 && cnpjLimpo.length !== 11) {
      await sendWhatsApp("CNPJ/CPF inválido. Por favor, informe novamente:", conversa.canal_instancia);
      return;
    }
    novasRespostas[step.campo_destino || "cnpj"] = cnpjLimpo;

    // Try to find client
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome_fantasia, filial_id")
      .eq("cnpj_cpf", cnpjLimpo)
      .maybeSingle();

    if (cliente) {
      updates.cliente_id = cliente.id;
      updates.filial_id = cliente.filial_id;
    }
  } else {
    // texto_livre
    novasRespostas[step.campo_destino || `step_${passoAtual}`] = resposta.trim();
    if (step.campo_destino === "nome_cliente") {
      updates.nome_cliente = resposta.trim();
    }
  }

  const proximoPasso = passoAtual + 1;

  if (proximoPasso <= fluxo.length) {
    // Next step
    const nextStep = fluxo[proximoPasso - 1];
    let textoEnviar = nextStep.pergunta;

    if (nextStep.tipo === "opcoes" && nextStep.opcoes) {
      const opcoes = nextStep.opcoes as Array<{ numero: number; texto: string }>;
      textoEnviar += "\n\n" + opcoes.map((o) => `${o.numero} - ${o.texto}`).join("\n");
    }

    await sendWhatsApp(textoEnviar, conversa.canal_instancia);
    await supabase.from("chat_mensagens").insert({
      conversa_id: conversa.id,
      tipo: "bot",
      conteudo: textoEnviar,
      remetente: "bot",
    });

    await supabase
      .from("chat_conversas")
      .update({
        ...updates,
        bot_estado: {
          passo: proximoPasso,
          respostas: novasRespostas,
          aguardando_campo: nextStep.campo_destino || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversa.id);
  } else {
    // Bot completed - move to queue
    const msgAg =
      config?.mensagem_aguardando ||
      "Aguarde um instante, nossa equipe já vai lhe atender. 🤗";
    await sendWhatsApp(msgAg, conversa.canal_instancia);
    await supabase.from("chat_mensagens").insert({
      conversa_id: conversa.id,
      tipo: "bot",
      conteudo: msgAg,
      remetente: "bot",
    });

    await supabase
      .from("chat_conversas")
      .update({
        ...updates,
        status: "aguardando",
        bot_estado: { passo: "concluido", respostas: novasRespostas },
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversa.id);

    // Insert into queue
    await supabase.from("chat_fila").insert({
      conversa_id: conversa.id,
      setor_id: updates.setor_id || conversa.setor_id || null,
      filial_id: updates.filial_id || conversa.filial_id || null,
      status: "aguardando",
    });

    // Create notification for agents
    if (updates.setor_id || conversa.setor_id) {
      const setorId = updates.setor_id || conversa.setor_id;
      const { data: agentes } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("setor_id", setorId);

      if (agentes && agentes.length > 0) {
        const notifs = agentes.map((a: any) => ({
          user_id: a.user_id,
          titulo: "Nova conversa na fila",
          mensagem: `${updates.nome_cliente || conversa.nome_cliente || "Cliente"} está aguardando atendimento`,
          tipo: "chat",
          link: "/chat",
        }));

        await supabase.from("notificacoes_internas").insert(notifs).throwOnError().catch(() => {});
      }
    }
  }
}

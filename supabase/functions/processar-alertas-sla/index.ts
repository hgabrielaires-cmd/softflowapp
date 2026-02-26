import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get all active etapas with SLA control
    const { data: etapas } = await supabase
      .from("painel_etapas")
      .select("id, nome, controla_sla, prazo_maximo_horas")
      .eq("ativo", true)
      .eq("controla_sla", true)
      .not("prazo_maximo_horas", "is", null);

    if (!etapas || etapas.length === 0) {
      return new Response(JSON.stringify({ message: "Sem etapas com SLA" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const etapaIds = etapas.map((e: any) => e.id);
    const etapaMap: Record<string, any> = {};
    etapas.forEach((e: any) => { etapaMap[e.id] = e; });

    // 2. Get all cards NOT started, in etapas with SLA
    const { data: cards } = await supabase
      .from("painel_atendimento")
      .select("id, etapa_id, filial_id, cliente_id, contrato_id, pedido_id, created_at, tipo_operacao")
      .is("iniciado_em", null)
      .in("etapa_id", etapaIds);

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ message: "Sem cards atrasados" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter only overdue cards
    const now = Date.now();
    const overdueCards = cards.filter((c: any) => {
      const etapa = etapaMap[c.etapa_id];
      if (!etapa) return false;
      const criado = new Date(c.created_at).getTime();
      const diffHoras = (now - criado) / (1000 * 60 * 60);
      return diffHoras > etapa.prazo_maximo_horas;
    });

    if (overdueCards.length === 0) {
      return new Response(JSON.stringify({ message: "Sem cards atrasados agora" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get all active alerts for relevant etapas
    const { data: alertas } = await supabase
      .from("painel_etapa_alertas")
      .select("*")
      .eq("ativo", true)
      .in("etapa_id", etapaIds)
      .order("nivel");

    if (!alertas || alertas.length === 0) {
      return new Response(JSON.stringify({ message: "Sem alertas configurados" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get already sent alerts
    const cardIds = overdueCards.map((c: any) => c.id);
    const alertaIds = alertas.map((a: any) => a.id);

    const { data: jaEnviados } = await supabase
      .from("painel_alertas_enviados")
      .select("card_id, alerta_id")
      .in("card_id", cardIds)
      .in("alerta_id", alertaIds);

    const enviadoSet = new Set(
      (jaEnviados || []).map((e: any) => `${e.card_id}::${e.alerta_id}`)
    );

    // 5. Get WhatsApp config
    const { data: whatsappConfig } = await supabase
      .from("integracoes_config")
      .select("server_url, token, ativo")
      .eq("nome", "whatsapp")
      .maybeSingle();

    const whatsappEnabled = whatsappConfig?.ativo && whatsappConfig?.server_url && whatsappConfig?.token;

    // 6. Get templates
    const templateIds = [...new Set(alertas.map((a: any) => a.template_id).filter(Boolean))];
    let templateMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from("message_templates")
        .select("id, conteudo, tipo")
        .in("id", templateIds);
      (templates || []).forEach((t: any) => { templateMap[t.id] = t; });
    }

    // 7. Get profile info for usuario_ids referenced in alerts
    const allUserIds = [...new Set(alertas.flatMap((a: any) => a.usuario_ids || []))];
    let profileMap: Record<string, any> = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, telefone")
        .in("id", allUserIds);
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    }

    // 8. Get client + contract info for variable replacement
    const clienteIds = [...new Set(overdueCards.map((c: any) => c.cliente_id))];
    const contratoIds = [...new Set(overdueCards.map((c: any) => c.contrato_id).filter(Boolean))];

    let clienteMap: Record<string, any> = {};
    if (clienteIds.length > 0) {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_fantasia")
        .in("id", clienteIds);
      (clientes || []).forEach((c: any) => { clienteMap[c.id] = c; });
    }

    let contratoMap: Record<string, any> = {};
    if (contratoIds.length > 0) {
      const { data: contratos } = await supabase
        .from("contratos")
        .select("id, numero_exibicao")
        .in("id", contratoIds);
      (contratos || []).forEach((c: any) => { contratoMap[c.id] = c; });
    }

    // Get vendedor info for cards with pedido_id (for notificar_vendedor)
    const pedidoIds = [...new Set(overdueCards.map((c: any) => c.pedido_id).filter(Boolean))];
    let vendedorMap: Record<string, any> = {}; // pedido_id -> profile
    if (pedidoIds.length > 0) {
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, vendedor_id")
        .in("id", pedidoIds);

      const vendedorUserIds = [...new Set((pedidos || []).map((p: any) => p.vendedor_id).filter(Boolean))];
      if (vendedorUserIds.length > 0) {
        const { data: vendedorProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, telefone")
          .in("user_id", vendedorUserIds);
        const vByUserId: Record<string, any> = {};
        (vendedorProfiles || []).forEach((p: any) => { vByUserId[p.user_id] = p; });
        (pedidos || []).forEach((p: any) => {
          vendedorMap[p.id] = vByUserId[p.vendedor_id] || null;
        });
      }
    }

    // 9. Process each overdue card
    let totalEnviados = 0;
    const insertBatch: any[] = [];

    for (const card of overdueCards) {
      const etapa = etapaMap[card.etapa_id];
      const criado = new Date(card.created_at).getTime();
      const horasAtrasado = (now - criado) / (1000 * 60 * 60) - etapa.prazo_maximo_horas;

      // Get alerts for this etapa + filial
      const cardAlertas = alertas.filter(
        (a: any) => a.etapa_id === card.etapa_id && a.filial_id === card.filial_id
      );

      for (const alerta of cardAlertas) {
        const key = `${card.id}::${alerta.id}`;
        if (enviadoSet.has(key)) continue; // Already sent

        // Check if enough time has passed for this level
        if (alerta.horas_apos_sla > horasAtrasado) continue; // Not yet time

        // Check that previous levels were sent (for levels 2+)
        if (alerta.nivel > 1) {
          const previousLevel = cardAlertas.find(
            (a: any) => a.canal === alerta.canal && a.nivel === alerta.nivel - 1
          );
          if (previousLevel && !enviadoSet.has(`${card.id}::${previousLevel.id}`)) {
            continue; // Previous level not sent yet
          }
        }

        // Build message from template
        const template = alerta.template_id ? templateMap[alerta.template_id] : null;
        const cliente = clienteMap[card.cliente_id];
        const contrato = contratoMap[card.contrato_id];

        // Calculate atraso tempo display
        const horasInt = Math.floor(horasAtrasado);
        const minutosInt = Math.floor((horasAtrasado % 1) * 60);
        const atrasoTempo = horasInt > 0
          ? `${horasInt}h${minutosInt > 0 ? String(minutosInt).padStart(2, "0") + "min" : ""}`
          : `${minutosInt}min`;

        const replaceVars = (text: string, userName?: string) => {
          return text
            .replace(/\{usuario\.nome\}/g, userName || "Usuário")
            .replace(/\{cliente\.nome_fantasia\}/g, cliente?.nome_fantasia || "N/A")
            .replace(/\{contrato\.numero\}/g, contrato?.numero_exibicao || "N/A")
            .replace(/\{operacao\.tipo\}/g, card.tipo_operacao || "N/A")
            .replace(/\{etapa\.nome\}/g, etapa?.nome || "N/A")
            .replace(/\{atraso\.tempo\}/g, atrasoTempo);
        };

        // Collect recipients
        const recipients: { profileId: string; profile: any }[] = [];

        // Add configured users
        for (const uid of (alerta.usuario_ids || [])) {
          const profile = profileMap[uid];
          if (profile) recipients.push({ profileId: uid, profile });
        }

        // Add vendedor if configured
        if (alerta.notificar_vendedor && card.pedido_id) {
          const vendedorProfile = vendedorMap[card.pedido_id];
          if (vendedorProfile && !recipients.find((r) => r.profileId === vendedorProfile.id)) {
            recipients.push({ profileId: vendedorProfile.id, profile: vendedorProfile });
          }
        }

        if (alerta.canal === "whatsapp" && whatsappEnabled && template) {
          // Send WhatsApp to each recipient
          for (const { profile } of recipients) {
            if (!profile?.telefone) continue;
            const text = replaceVars(template.conteudo, profile.full_name);

            let formattedNumber = profile.telefone.replace(/\D/g, "");
            if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
            if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

            // Normalize URL
            let baseUrl = whatsappConfig!.server_url!.replace(/\/+$/, "");
            try {
              const parsed = new URL(baseUrl);
              if (parsed.protocol === "https:" && parsed.port && parsed.port !== "443") {
                baseUrl = baseUrl.replace(/^https:/, "http:");
              }
            } catch { /* keep */ }

            try {
              await fetch(`${baseUrl}/message/sendText/Softflow_WhatsApp`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: whatsappConfig!.token!,
                },
                body: JSON.stringify({
                  number: formattedNumber,
                  text,
                }),
              });
              console.log(`[SLA] WhatsApp enviado para ${profile.full_name} (${formattedNumber}) - nível ${alerta.nivel}`);
            } catch (err) {
              console.error(`[SLA] Erro WhatsApp para ${profile.full_name}:`, err);
            }
          }
        }

        if (alerta.canal === "notificacao" && template) {
          // Create in-app notification for each recipient
          for (const { profile } of recipients) {
            const mensagem = replaceVars(template.conteudo, profile.full_name);
            try {
              await supabase.from("notificacoes").insert({
                titulo: `⚠️ Tarefa Atrasada - Nível ${alerta.nivel}`,
                mensagem,
                tipo: alerta.nivel >= 3 ? "urgente" : alerta.nivel >= 2 ? "aviso" : "info",
                destinatario_user_id: profile.user_id,
                criado_por: profile.user_id, // system-generated
              });
              console.log(`[SLA] Notificação criada para ${profile.full_name} - nível ${alerta.nivel}`);
            } catch (err) {
              console.error(`[SLA] Erro notificação para ${profile.full_name}:`, err);
            }
          }
        }

        // Mark as sent
        insertBatch.push({
          card_id: card.id,
          alerta_id: alerta.id,
          canal: alerta.canal,
          nivel: alerta.nivel,
          detalhes: {
            recipients: recipients.map((r) => r.profile?.full_name),
            template_id: alerta.template_id,
            atraso_horas: horasAtrasado.toFixed(2),
          },
        });
        enviadoSet.add(key); // prevent re-send within same run
        totalEnviados++;
      }
    }

    // Batch insert sent records
    if (insertBatch.length > 0) {
      const { error: insertError } = await supabase
        .from("painel_alertas_enviados")
        .insert(insertBatch);
      if (insertError) {
        console.error("[SLA] Erro ao registrar alertas enviados:", insertError);
      }
    }

    console.log(`[SLA] Processamento concluído: ${totalEnviados} alertas enviados de ${overdueCards.length} cards atrasados.`);

    return new Response(
      JSON.stringify({
        success: true,
        cards_atrasados: overdueCards.length,
        alertas_enviados: totalEnviados,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[SLA] Erro geral:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

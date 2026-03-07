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

    // 1. Load active automations
    const { data: automacoes } = await supabase
      .from("automacoes")
      .select("*")
      .eq("ativo", true);

    if (!automacoes || automacoes.length === 0) {
      return new Response(JSON.stringify({ message: "Sem automações ativas" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. WhatsApp config
    const { data: whatsappConfig } = await supabase
      .from("integracoes_config")
      .select("server_url, token, ativo")
      .eq("nome", "whatsapp")
      .maybeSingle();

    const whatsappEnabled = whatsappConfig?.ativo && whatsappConfig?.server_url && whatsappConfig?.token;

    // 3. Load templates
    const templateIds = [...new Set(automacoes.map((a: any) => a.acao_config?.template_id).filter(Boolean))];
    let templateMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from("message_templates")
        .select("id, conteudo, tipo, setor_id")
        .in("id", templateIds);
      (templates || []).forEach((t: any) => { templateMap[t.id] = t; });
    }

    // Resolve instance names from setores
    const setorIds = [...new Set(Object.values(templateMap).map((t: any) => t.setor_id).filter(Boolean))];
    let setorInstanceMap: Record<string, string> = {};
    if (setorIds.length > 0) {
      const { data: setores } = await supabase
        .from("setores")
        .select("id, instance_name")
        .in("id", setorIds);
      (setores || []).forEach((s: any) => {
        if (s.instance_name) setorInstanceMap[s.id] = s.instance_name;
      });
    }

    let totalProcessed = 0;
    const now = Date.now();

    // ─── Process: tempo_sem_acao_financeiro ───
    const tempoFinanceiro = automacoes.filter((a: any) => a.gatilho_tipo === "tempo_sem_acao_financeiro");

    if (tempoFinanceiro.length > 0) {
      // Get pedidos stuck in "Aguardando Financeiro"
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, cliente_id, vendedor_id, filial_id, created_at, updated_at, numero_exibicao, financeiro_status")
        .eq("financeiro_status", "Aguardando Financeiro");

      if (pedidos && pedidos.length > 0) {
        // Load profiles for recipients
        const allUserIds = [...new Set(tempoFinanceiro.flatMap((a: any) => a.acao_config?.usuario_ids || []))];
        const roleDestinatarios = [...new Set(tempoFinanceiro.map((a: any) => a.acao_config?.destinatario_valor).filter(Boolean))];

        let profileMap: Record<string, any> = {};
        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, user_id, full_name, telefone")
            .in("id", allUserIds);
          (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
        }

        // Load profiles by role
        let roleProfileMap: Record<string, any[]> = {};
        if (roleDestinatarios.length > 0) {
          const { data: roleUsers } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("role", roleDestinatarios);

          if (roleUsers && roleUsers.length > 0) {
            const roleUserIds = roleUsers.map((r: any) => r.user_id);
            const { data: roleProfiles } = await supabase
              .from("profiles")
              .select("id, user_id, full_name, telefone")
              .in("user_id", roleUserIds)
              .eq("active", true);

            roleUsers.forEach((ru: any) => {
              const profile = (roleProfiles || []).find((p: any) => p.user_id === ru.user_id);
              if (profile) {
                if (!roleProfileMap[ru.role]) roleProfileMap[ru.role] = [];
                roleProfileMap[ru.role].push(profile);
              }
            });
          }
        }

        // Load clientes
        const clienteIds = [...new Set(pedidos.map((p: any) => p.cliente_id))];
        let clienteMap: Record<string, any> = {};
        if (clienteIds.length > 0) {
          const { data: clientes } = await supabase
            .from("clientes")
            .select("id, nome_fantasia")
            .in("id", clienteIds);
          (clientes || []).forEach((c: any) => { clienteMap[c.id] = c; });
        }

        // Load vendedores
        const vendedorIds = [...new Set(pedidos.map((p: any) => p.vendedor_id).filter(Boolean))];
        let vendedorProfileMap: Record<string, any> = {};
        if (vendedorIds.length > 0) {
          const { data: vProfiles } = await supabase
            .from("profiles")
            .select("id, user_id, full_name, telefone")
            .in("user_id", vendedorIds);
          (vProfiles || []).forEach((p: any) => { vendedorProfileMap[p.user_id] = p; });
        }

        // Get existing logs for these pedidos to handle reminders
        const pedidoIds = pedidos.map((p: any) => p.id);
        const relevantAutoIds = tempoFinanceiro.map((a: any) => a.id);
        const { data: existingLogs } = await supabase
          .from("automacoes_log")
          .select("automacao_id, referencia_id, nivel, executado_em")
          .in("automacao_id", relevantAutoIds)
          .in("referencia_id", pedidoIds)
          .eq("referencia_tipo", "pedido");

        for (const automacao of tempoFinanceiro) {
          const horasConfig = automacao.gatilho_config?.horas || 24;

          for (const pedido of pedidos) {
            const updatedAt = new Date(pedido.updated_at).getTime();
            const horasParado = (now - updatedAt) / (1000 * 60 * 60);

            if (horasParado < horasConfig) continue;

            // Check existing logs for this pedido + automacao
            const logs = (existingLogs || []).filter(
              (l: any) => l.automacao_id === automacao.id && l.referencia_id === pedido.id
            );
            const maxNivel = logs.length > 0 ? Math.max(...logs.map((l: any) => l.nivel)) : 0;

            // Determine if we should send
            let shouldSend = false;
            let currentNivel = 1;

            if (maxNivel === 0) {
              // Never sent
              shouldSend = true;
              currentNivel = 1;
            } else if (automacao.lembrete_ativo && maxNivel < (automacao.lembrete_maximo || 3)) {
              // Check if enough time passed since last reminder
              const lastLog = logs.sort((a: any, b: any) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime())[0];
              const horasSinceLastLog = (now - new Date(lastLog.executado_em).getTime()) / (1000 * 60 * 60);
              if (horasSinceLastLog >= (automacao.lembrete_intervalo_horas || 24)) {
                shouldSend = true;
                currentNivel = maxNivel + 1;
              }
            }

            if (!shouldSend) continue;

            // Collect recipients
            const recipients: any[] = [];
            if (automacao.acao_config?.destinatario_tipo === "role" && automacao.acao_config?.destinatario_valor) {
              const roleProfiles = roleProfileMap[automacao.acao_config.destinatario_valor] || [];
              recipients.push(...roleProfiles);
            }
            if (automacao.acao_config?.usuario_ids?.length > 0) {
              for (const uid of automacao.acao_config.usuario_ids) {
                const p = profileMap[uid];
                if (p && !recipients.find((r: any) => r.id === p.id)) recipients.push(p);
              }
            }

            const template = automacao.acao_config?.template_id ? templateMap[automacao.acao_config.template_id] : null;
            const cliente = clienteMap[pedido.cliente_id];
            const vendedor = vendedorProfileMap[pedido.vendedor_id];

            const horasInt = Math.floor(horasParado);
            const minutosInt = Math.floor((horasParado % 1) * 60);
            const tempoParado = horasInt > 0
              ? `${horasInt}h${minutosInt > 0 ? String(minutosInt).padStart(2, "0") + "min" : ""}`
              : `${minutosInt}min`;

            const replaceVars = (text: string, userName?: string) => {
              return text
                .replace(/\{usuario\.nome\}/g, userName || "Usuário")
                .replace(/\{cliente\.nome_fantasia\}/g, cliente?.nome_fantasia || "N/A")
                .replace(/\{pedido\.numero\}/g, pedido.numero_exibicao || "N/A")
                .replace(/\{vendedor\.nome\}/g, vendedor?.full_name || "N/A")
                .replace(/\{atraso\.tempo\}/g, tempoParado)
                .replace(/\{saudacao\}/g, getSaudacao());
            };

            // Send WhatsApp
            if ((automacao.acao_tipo === "whatsapp" || automacao.acao_tipo === "whatsapp_e_notificacao") && whatsappEnabled && template) {
              for (const profile of recipients) {
                if (!profile?.telefone) continue;
                const text = replaceVars(template.conteudo, profile.full_name);
                let formattedNumber = profile.telefone.replace(/\D/g, "");
                if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
                if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

                let baseUrl = whatsappConfig!.server_url!.replace(/\/+$/, "");
                try {
                  const parsed = new URL(baseUrl);
                  if (parsed.protocol === "https:" && parsed.port && parsed.port !== "443") {
                    baseUrl = baseUrl.replace(/^https:/, "http:");
                  }
                } catch { /* keep */ }

                const resolvedSetorId = template?.setor_id || null;
                const instanceName = resolvedSetorId ? (setorInstanceMap[resolvedSetorId] || "Softflow_WhatsApp") : "Softflow_WhatsApp";

                try {
                  await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: whatsappConfig!.token! },
                    body: JSON.stringify({ number: formattedNumber, text }),
                  });
                  console.log(`[AUTO] WhatsApp enviado para ${profile.full_name} (${formattedNumber}) - nível ${currentNivel}`);
                } catch (err) {
                  console.error(`[AUTO] Erro WhatsApp:`, err);
                }
              }
            }

            // Send Notification
            if (automacao.acao_tipo === "notificacao" || automacao.acao_tipo === "whatsapp_e_notificacao") {
              for (const profile of recipients) {
                const mensagem = template ? replaceVars(template.conteudo, profile.full_name)
                  : `Pedido ${pedido.numero_exibicao || "N/A"} de ${cliente?.nome_fantasia || "N/A"} está parado na fila do financeiro há ${tempoParado}.`;
                try {
                  await supabase.from("notificacoes").insert({
                    titulo: currentNivel > 1
                      ? `🔔 Lembrete #${currentNivel} - Pedido na Fila Financeira`
                      : `🔔 Pedido na Fila do Financeiro`,
                    mensagem,
                    tipo: currentNivel >= 3 ? "urgente" : currentNivel >= 2 ? "aviso" : "info",
                    destinatario_user_id: profile.user_id,
                    criado_por: profile.user_id,
                  });
                  console.log(`[AUTO] Notificação criada para ${profile.full_name} - nível ${currentNivel}`);
                } catch (err) {
                  console.error(`[AUTO] Erro notificação:`, err);
                }
              }
            }

            // Log execution
            await supabase.from("automacoes_log").insert({
              automacao_id: automacao.id,
              referencia_tipo: "pedido",
              referencia_id: pedido.id,
              canal: automacao.acao_tipo,
              nivel: currentNivel,
              detalhes: {
                recipients: recipients.map((r: any) => r.full_name),
                template_id: automacao.acao_config?.template_id,
                horas_parado: horasParado.toFixed(2),
              },
            });
            totalProcessed++;
          }
        }
      }
    }

    // ─── Process: pedido_status (event-driven, called via body payload) ───
    let body: any = null;
    try { body = await req.json(); } catch { /* no body = cron run */ }

    if (body?.evento === "pedido_status_change") {
      const statusAutomacoes = automacoes.filter((a: any) => a.gatilho_tipo === "pedido_status");

      for (const automacao of statusAutomacoes) {
        const cfg = automacao.gatilho_config;
        const matchDe = !cfg.status_de || cfg.status_de === "qualquer" || cfg.status_de === body.status_anterior;
        const matchPara = cfg.status_para === body.status_novo;

        if (!matchDe || !matchPara) continue;

        // Build recipients and send (same logic as above)
        const recipients: any[] = [];

        if (automacao.acao_config?.destinatario_tipo === "role" && automacao.acao_config?.destinatario_valor) {
          const { data: roleUsers } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", automacao.acao_config.destinatario_valor);

          if (roleUsers && roleUsers.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, user_id, full_name, telefone")
              .in("user_id", roleUsers.map((r: any) => r.user_id))
              .eq("active", true);
            recipients.push(...(profiles || []));
          }
        }

        if (automacao.acao_config?.usuario_ids?.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, user_id, full_name, telefone")
            .in("id", automacao.acao_config.usuario_ids)
            .eq("active", true);
          for (const p of (profiles || [])) {
            if (!recipients.find((r: any) => r.id === p.id)) recipients.push(p);
          }
        }

        const template = automacao.acao_config?.template_id ? templateMap[automacao.acao_config.template_id] : null;

        // Load pedido details
        const { data: pedido } = await supabase
          .from("pedidos")
          .select("id, numero_exibicao, cliente_id, vendedor_id")
          .eq("id", body.pedido_id)
          .maybeSingle();

        let clienteNome = "N/A";
        let vendedorNome = "N/A";
        if (pedido) {
          const { data: cliente } = await supabase
            .from("clientes")
            .select("nome_fantasia")
            .eq("id", pedido.cliente_id)
            .maybeSingle();
          clienteNome = cliente?.nome_fantasia || "N/A";

          if (pedido.vendedor_id) {
            const { data: vendedor } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", pedido.vendedor_id)
              .maybeSingle();
            vendedorNome = vendedor?.full_name || "N/A";
          }
        }

        const replaceVars = (text: string, userName?: string) => {
          return text
            .replace(/\{usuario\.nome\}/g, userName || "Usuário")
            .replace(/\{cliente\.nome_fantasia\}/g, clienteNome)
            .replace(/\{pedido\.numero\}/g, pedido?.numero_exibicao || "N/A")
            .replace(/\{vendedor\.nome\}/g, vendedorNome)
            .replace(/\{status\.anterior\}/g, body.status_anterior || "N/A")
            .replace(/\{status\.novo\}/g, body.status_novo || "N/A")
            .replace(/\{saudacao\}/g, getSaudacao());
        };

        // Send
        if ((automacao.acao_tipo === "whatsapp" || automacao.acao_tipo === "whatsapp_e_notificacao") && whatsappEnabled && template) {
          for (const profile of recipients) {
            if (!profile?.telefone) continue;
            const text = replaceVars(template.conteudo, profile.full_name);
            let formattedNumber = profile.telefone.replace(/\D/g, "");
            if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
            if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

            let baseUrl = whatsappConfig!.server_url!.replace(/\/+$/, "");
            try {
              const parsed = new URL(baseUrl);
              if (parsed.protocol === "https:" && parsed.port && parsed.port !== "443") {
                baseUrl = baseUrl.replace(/^https:/, "http:");
              }
            } catch { /* keep */ }

            const resolvedSetorId = template?.setor_id || null;
            const instanceName = resolvedSetorId ? (setorInstanceMap[resolvedSetorId] || "Softflow_WhatsApp") : "Softflow_WhatsApp";

            try {
              await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: whatsappConfig!.token! },
                body: JSON.stringify({ number: formattedNumber, text }),
              });
              console.log(`[AUTO] WhatsApp pedido_status → ${profile.full_name}`);
            } catch (err) {
              console.error(`[AUTO] Erro WhatsApp pedido_status:`, err);
            }
          }
        }

        if (automacao.acao_tipo === "notificacao" || automacao.acao_tipo === "whatsapp_e_notificacao") {
          for (const profile of recipients) {
            const mensagem = template
              ? replaceVars(template.conteudo, profile.full_name)
              : `Pedido ${pedido?.numero_exibicao || "N/A"} de ${clienteNome} mudou para "${body.status_novo}".`;
            try {
              await supabase.from("notificacoes").insert({
                titulo: `📋 Pedido: ${body.status_novo}`,
                mensagem,
                tipo: "info",
                destinatario_user_id: profile.user_id,
                criado_por: profile.user_id,
              });
              console.log(`[AUTO] Notificação pedido_status → ${profile.full_name}`);
            } catch (err) {
              console.error(`[AUTO] Erro notificação pedido_status:`, err);
            }
          }
        }

        await supabase.from("automacoes_log").insert({
          automacao_id: automacao.id,
          referencia_tipo: "pedido",
          referencia_id: body.pedido_id,
          canal: automacao.acao_tipo,
          nivel: 1,
          detalhes: {
            evento: "pedido_status_change",
            status_anterior: body.status_anterior,
            status_novo: body.status_novo,
            recipients: recipients.map((r: any) => r.full_name),
          },
        });
        totalProcessed++;
      }
    }

    console.log(`[AUTO] Processamento concluído: ${totalProcessed} automações disparadas.`);

    return new Response(
      JSON.stringify({ success: true, total_processed: totalProcessed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[AUTO] Erro geral:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getSaudacao(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

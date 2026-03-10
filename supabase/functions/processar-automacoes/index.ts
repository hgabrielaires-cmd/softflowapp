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
    // ── Autenticação: aceita service role, anon key (cron) ou JWT válido ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET") || "";

    const isSystemCall = token === serviceRoleKey || (cronSecret && token === cronSecret);

    if (!isSystemCall) {
      const tempClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { error: claimsError } = await tempClient.auth.getClaims(token);
      if (claimsError) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
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
        .select("id, cliente_id, vendedor_id, filial_id, created_at, updated_at, data_entrada_fila, numero_exibicao, financeiro_status, tipo_pedido")
        .eq("status_pedido", "Aguardando Financeiro");

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
            // Filter by tipo_pedido if configured
            const cfgTipo = automacao.gatilho_config?.tipo_pedido;
            if (cfgTipo && cfgTipo !== "qualquer" && pedido.tipo_pedido !== cfgTipo) continue;

            const entradaFila = pedido.data_entrada_fila || pedido.updated_at;
            const entradaFilaMs = new Date(entradaFila).getTime();
            const horasParado = (now - entradaFilaMs) / (1000 * 60 * 60);

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

        // Filter by tipo_pedido if configured (from body payload or will be checked after loading pedido)
        const cfgTipo = cfg.tipo_pedido;
        const bodyTipo = body.tipo_pedido;
        // If we have both config and body tipo, check now. If body is missing, we'll check after loading pedido.
        if (cfgTipo && cfgTipo !== "qualquer" && bodyTipo && cfgTipo !== bodyTipo) continue;

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

        // Load pedido details (full data for variable substitution)
        const { data: pedido } = await supabase
          .from("pedidos")
          .select("id, numero_exibicao, cliente_id, vendedor_id, plano_id, filial_id, valor_implantacao, valor_mensalidade, valor_implantacao_original, valor_mensalidade_original, valor_implantacao_final, valor_mensalidade_final, desconto_implantacao_tipo, desconto_implantacao_valor, desconto_mensalidade_tipo, desconto_mensalidade_valor, modulos_adicionais, observacoes, motivo_desconto, pagamento_mensalidade_observacao, pagamento_implantacao_observacao, pagamento_mensalidade_forma, pagamento_implantacao_forma, pagamento_implantacao_parcelas, contrato_id, tipo_pedido, servicos_pedido, created_at")
          .eq("id", body.pedido_id)
          .maybeSingle();

        // Secondary tipo_pedido check (fallback when body didn't include it)
        if (cfgTipo && cfgTipo !== "qualquer" && !bodyTipo && pedido) {
          if (pedido.tipo_pedido !== cfgTipo) continue;
        }

        let clienteNome = "N/A";
        let vendedorNome = "N/A";
        let planoNome = "N/A";
        let contratoNumero = "N/A";
        let filialNome = "N/A";

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

          if (pedido.plano_id) {
            const { data: plano } = await supabase
              .from("planos")
              .select("nome")
              .eq("id", pedido.plano_id)
              .maybeSingle();
            planoNome = plano?.nome || "N/A";
          }

          if (pedido.contrato_id) {
            const { data: contrato } = await supabase
              .from("contratos")
              .select("numero_exibicao")
              .eq("id", pedido.contrato_id)
              .maybeSingle();
            contratoNumero = contrato?.numero_exibicao || "N/A";
          }

          if (pedido.filial_id) {
            const { data: filial } = await supabase
              .from("filiais")
              .select("nome")
              .eq("id", pedido.filial_id)
              .maybeSingle();
            filialNome = filial?.nome || "N/A";
          }
        }

        // Build espelho do pedido
        const fmtCurrency = (v: any) => {
          const num = Number(v) || 0;
          return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        };

        let espelhoPedido = "";
        if (pedido) {
          const lines: string[] = [];

          // ☑️ Módulos Contratados (do plano)
          if (pedido.plano_id) {
            lines.push("☑️ *Módulos Contratados*");
            lines.push(`Plano *${planoNome}*`);

            // Usar descrição do plano ao invés de listar módulos individuais
            const { data: planoInfo } = await supabase
              .from("planos")
              .select("descricao, valor_mensalidade_padrao")
              .eq("id", pedido.plano_id)
              .maybeSingle();

            if (planoInfo?.descricao) {
              lines.push(planoInfo.descricao);
            }

            if (planoInfo?.valor_mensalidade_padrao) {
              lines.push("");
              lines.push(`Valor base do plano: ${fmtCurrency(planoInfo.valor_mensalidade_padrao)}`);
            }
          }

          // 🔘 ADICIONAIS
          let totalAdicionais = 0;
          const mods = pedido.modulos_adicionais
            ? (typeof pedido.modulos_adicionais === "string" ? JSON.parse(pedido.modulos_adicionais) : pedido.modulos_adicionais)
            : [];

          if (Array.isArray(mods) && mods.length > 0) {
            lines.push("");
            lines.push("🔘 *ADICIONAIS*");
            for (const mod of mods) {
              const qty = mod.quantidade || 1;
              const unitPrice = Number(mod.valor_mensalidade_modulo) || 0;
              const subtotal = qty * unitPrice;
              totalAdicionais += subtotal;
              const modName = mod.nome || "Módulo";
              if (qty > 1) {
                lines.push(`✔️ ${modName} (${qty}x ${fmtCurrency(unitPrice)}) - ${fmtCurrency(subtotal)}`);
              } else {
                lines.push(`✔️ ${modName} - ${fmtCurrency(unitPrice)}`);
              }
            }
            lines.push(`Total adicionais: ${fmtCurrency(totalAdicionais)}`);
          }

          // MENSALIDADE TOTAL
          const mensOriginal = Number(pedido.valor_mensalidade_original) || 0;
          const mensFinal = Number(pedido.valor_mensalidade_final) || mensOriginal;
          lines.push("");
          lines.push("*MENSALIDADE TOTAL*");
          if (mensOriginal !== mensFinal && mensOriginal > 0) {
            lines.push(`~${fmtCurrency(mensOriginal)}~ *${fmtCurrency(mensFinal)}*`);
          } else {
            lines.push(`*${fmtCurrency(mensFinal)}*`);
          }

          // Forma de pagamento mensalidade
          if (pedido.pagamento_mensalidade_observacao || pedido.pagamento_mensalidade_forma) {
            lines.push("");
            if (pedido.pagamento_mensalidade_observacao) lines.push(pedido.pagamento_mensalidade_observacao);
            if (pedido.pagamento_mensalidade_forma) lines.push(pedido.pagamento_mensalidade_forma.toUpperCase());
          }

          // IMPLANTAÇÃO
          const implOriginal = Number(pedido.valor_implantacao_original) || 0;
          const implFinal = Number(pedido.valor_implantacao_final) || implOriginal;
          lines.push("");
          lines.push("*IMPLANTAÇÃO E TREINAMENTO*");
          if (implOriginal !== implFinal && implOriginal > 0) {
            lines.push(`~${fmtCurrency(implOriginal)}~ *${fmtCurrency(implFinal)}*`);
          } else {
            lines.push(`*${fmtCurrency(implFinal)}*`);
          }

          // Forma pagamento implantação
          if (pedido.pagamento_implantacao_observacao || pedido.pagamento_implantacao_forma) {
            if (pedido.pagamento_implantacao_observacao) lines.push(pedido.pagamento_implantacao_observacao);
            if (pedido.pagamento_implantacao_forma) lines.push(pedido.pagamento_implantacao_forma.toUpperCase());
          }

          // Observações
          if (pedido.observacoes) {
            lines.push("");
            lines.push("*Observações:*");
            lines.push(pedido.observacoes);
          }

          espelhoPedido = lines.join("\n");
        }

        // ─── Build {espelho.upgrade} for Upgrade pedidos ───
        let espelhoUpgrade = "";
        if (pedido && pedido.tipo_pedido === "Upgrade" && pedido.contrato_id) {
          const upLines: string[] = [];

          // Fetch base contract with plan info
          const { data: contratoBase } = await supabase
            .from("contratos")
            .select("id, numero_exibicao, plano_id, pedido_id, created_at, cliente_id")
            .eq("id", pedido.contrato_id)
            .maybeSingle();

          // Fetch current plan (from base contract)
          let planoAtualNome = "N/A";
          let planoAtualValor = 0;
          if (contratoBase?.plano_id) {
            const { data: planoAtual } = await supabase
              .from("planos")
              .select("nome, valor_mensalidade_padrao, valor_implantacao_padrao")
              .eq("id", contratoBase.plano_id)
              .maybeSingle();
            planoAtualNome = planoAtual?.nome || "N/A";
            planoAtualValor = Number(planoAtual?.valor_mensalidade_padrao) || 0;
          }

          // Fetch new plan (from upgrade pedido)
          let novoPlanoNome = "N/A";
          let novoPlanoValor = 0;
          let novoPlanoImplantacao = 0;
          if (pedido.plano_id) {
            const { data: novoPlano } = await supabase
              .from("planos")
              .select("nome, valor_mensalidade_padrao, valor_implantacao_padrao")
              .eq("id", pedido.plano_id)
              .maybeSingle();
            novoPlanoNome = novoPlano?.nome || "N/A";
            novoPlanoValor = Number(novoPlano?.valor_mensalidade_padrao) || 0;
            novoPlanoImplantacao = Number(novoPlano?.valor_implantacao_padrao) || 0;
          }

          // Fetch base contract's pedido (for original addons, discounts, payment)
          let pedidoBase: any = null;
          let adicionaisBaseList: any[] = [];
          if (contratoBase?.pedido_id) {
            const { data: pb } = await supabase
              .from("pedidos")
              .select("id, modulos_adicionais, valor_implantacao_original, valor_implantacao_final, valor_mensalidade_original, valor_mensalidade_final, motivo_desconto, desconto_implantacao_valor, desconto_mensalidade_valor, desconto_implantacao_tipo, desconto_mensalidade_tipo")
              .eq("id", contratoBase.pedido_id)
              .maybeSingle();
            pedidoBase = pb;
            if (pb?.modulos_adicionais) {
              adicionaisBaseList = typeof pb.modulos_adicionais === "string" ? JSON.parse(pb.modulos_adicionais) : pb.modulos_adicionais;
              if (!Array.isArray(adicionaisBaseList)) adicionaisBaseList = [];
            }
          }

          // Also fetch addons from other active aditivo contracts on the same base
          const { data: aditivosAtivos } = await supabase
            .from("contratos")
            .select("pedido_id")
            .eq("contrato_origem_id", contratoBase?.id)
            .eq("status", "Ativo")
            .eq("tipo", "Aditivo");

          if (aditivosAtivos && aditivosAtivos.length > 0) {
            const aditivoPedidoIds = aditivosAtivos.map((a: any) => a.pedido_id).filter(Boolean);
            if (aditivoPedidoIds.length > 0) {
              const { data: pedidosAditivos } = await supabase
                .from("pedidos")
                .select("modulos_adicionais")
                .in("id", aditivoPedidoIds);
              for (const pa of (pedidosAditivos || [])) {
                if (pa.modulos_adicionais) {
                  const mods = typeof pa.modulos_adicionais === "string" ? JSON.parse(pa.modulos_adicionais) : pa.modulos_adicionais;
                  if (Array.isArray(mods)) adicionaisBaseList.push(...mods);
                }
              }
            }
          }

          // Calculate "Cliente desde"
          let clienteDesde = "N/A";
          if (contratoBase?.created_at) {
            const dtBase = new Date(contratoBase.created_at);
            const agora = new Date();
            const diffMs = agora.getTime() - dtBase.getTime();
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const dtFormatted = dtBase.toLocaleDateString("pt-BR");
            if (diffDias >= 360) {
              const anos = Math.floor(diffDias / 365);
              const diasRestantes = diffDias % 365;
              clienteDesde = anos === 1
                ? `${dtFormatted} - 1 ano e ${diasRestantes} dias`
                : `${dtFormatted} - ${anos} anos e ${diasRestantes} dias`;
            } else {
              clienteDesde = `${dtFormatted} - ${diffDias} dias`;
            }
          }

          // Calculate total addons
          let totalAdicionaisBase = 0;
          const adicionaisFormatted: string[] = [];
          for (const mod of adicionaisBaseList) {
            const qty = mod.quantidade || 1;
            const unitPrice = Number(mod.valor_mensalidade_modulo) || 0;
            const subtotal = qty * unitPrice;
            totalAdicionaisBase += subtotal;
            const modName = mod.nome || "Módulo";
            if (qty > 1) {
              adicionaisFormatted.push(`${modName} ${fmtCurrency(unitPrice)} (${qty}x) ${fmtCurrency(subtotal)}`);
            } else {
              adicionaisFormatted.push(`${modName} ${fmtCurrency(unitPrice)}`);
            }
          }

          // Base contract implantation with discount
          const implOrigBase = Number(pedidoBase?.valor_implantacao_original) || 0;
          const implFinalBase = Number(pedidoBase?.valor_implantacao_final) || implOrigBase;
          const temDescontoImplBase = implOrigBase > 0 && implOrigBase !== implFinalBase;

          // Base contract mensalidade with discount
          const mensOrigBase = Number(pedidoBase?.valor_mensalidade_original) || planoAtualValor;
          const mensFinalBase = Number(pedidoBase?.valor_mensalidade_final) || mensOrigBase;
          const totalMensalidadeAtual = mensFinalBase; // plan + addons already included in final
          const descontoMensBase = mensOrigBase - mensFinalBase;

          // Upgrade pedido values
          const upgImplOrig = Number(pedido.valor_implantacao_original) || novoPlanoImplantacao;
          const upgImplFinal = Number(pedido.valor_implantacao_final) || upgImplOrig;
          const upgDescontoImpl = upgImplOrig - upgImplFinal;
          const upgMensOrig = Number(pedido.valor_mensalidade_original) || novoPlanoValor;
          const upgMensFinal = Number(pedido.valor_mensalidade_final) || upgMensOrig;
          const upgDescontoMens = upgMensOrig - upgMensFinal;

          // ── Build formatted message ──
          upLines.push(`Tipo: *Upgrade de Plano*`);
          upLines.push(``);
          upLines.push(`Vendedor: *${vendedorNome}*`);
          upLines.push(`Cliente: *${clienteNome}*`);
          upLines.push(`Nº Contrato Atual: *${contratoBase?.numero_exibicao || contratoNumero}*`);
          upLines.push(`Cliente desde: ${clienteDesde}`);
          upLines.push(``);

          // ☑️ Configuração Atual
          upLines.push(`☑️ *Configuração Atual*`);
          upLines.push(``);
          upLines.push(`Plano: ${planoAtualNome}`);
          upLines.push(`Valor: ${fmtCurrency(planoAtualValor)}`);
          upLines.push(``);
          if (adicionaisFormatted.length > 0) {
            upLines.push(`Adicionais:`);
            for (const ad of adicionaisFormatted) {
              upLines.push(ad);
            }
            upLines.push(``);
          }

          // Implantação base
          upLines.push(`Implantação:`);
          if (temDescontoImplBase) {
            upLines.push(`~${fmtCurrency(implOrigBase)}~ ${fmtCurrency(implFinalBase)}`);
          } else if (implOrigBase > 0) {
            upLines.push(fmtCurrency(implOrigBase));
          } else {
            upLines.push(fmtCurrency(implFinalBase));
          }
          if (pedidoBase?.motivo_desconto && temDescontoImplBase) {
            upLines.push(``);
            upLines.push(`*Motivo do desconto do contrato base:*`);
            upLines.push(pedidoBase.motivo_desconto);
          }
          upLines.push(``);

          // Mensalidade total atual
          upLines.push(`Mensalidade total:`);
          if (descontoMensBase > 0) {
            upLines.push(`~${fmtCurrency(mensOrigBase)}~ Desconto: ${fmtCurrency(descontoMensBase)}`);
            upLines.push(fmtCurrency(mensFinalBase));
          } else {
            upLines.push(fmtCurrency(mensFinalBase));
          }
          upLines.push(``);
          upLines.push(`════════════════════`);
          upLines.push(``);

          // ☑️ Desconto Solicitado
          upLines.push(`☑️ *Desconto Solicitado*`);
          upLines.push(``);
          upLines.push(`Novo Plano: *${novoPlanoNome}*`);
          upLines.push(`Valor do Plano: ${fmtCurrency(novoPlanoValor)}`);
          if (upgDescontoMens > 0) {
            upLines.push(`Desconto Solicitado: ${fmtCurrency(upgDescontoMens)}`);
            upLines.push(`Valor Final: *${fmtCurrency(novoPlanoValor - upgDescontoMens)}*`);
          }
          upLines.push(``);

          // Implantação do upgrade
          upLines.push(`Implantação:`);
          upLines.push(`Implantação dos módulos Plano: ${novoPlanoNome}`);
          if (upgDescontoImpl > 0) {
            upLines.push(`~${fmtCurrency(upgImplOrig)}~`);
            upLines.push(`Desconto Solicitado: ${fmtCurrency(upgDescontoImpl)}`);
            upLines.push(fmtCurrency(upgImplFinal));
          } else {
            upLines.push(fmtCurrency(upgImplOrig));
          }
          upLines.push(``);

          // ☑️ Nova Configuração (Upgrade)
          upLines.push(`☑️ *Nova Configuração (Upgrade)*`);
          upLines.push(``);
          upLines.push(`Plano: *${novoPlanoNome}*`);
          const valorPlanoFinal = novoPlanoValor - upgDescontoMens;
          upLines.push(`Valor: ${fmtCurrency(valorPlanoFinal)}`);
          upLines.push(``);
          if (adicionaisFormatted.length > 0) {
            upLines.push(`Adicionais:`);
            for (const ad of adicionaisFormatted) {
              upLines.push(ad);
            }
            upLines.push(``);
          }
          const novaMensalidadeTotal = valorPlanoFinal + totalAdicionaisBase;
          upLines.push(`Total Mensalidade: *${fmtCurrency(novaMensalidadeTotal)}*`);
          upLines.push(``);

          // Forma de pagamento mensalidade
          if (pedido.pagamento_mensalidade_forma || pedido.pagamento_mensalidade_observacao) {
            const formaMens = pedido.pagamento_mensalidade_forma || "";
            const obsMens = pedido.pagamento_mensalidade_observacao || "";
            upLines.push(`_${[formaMens, obsMens].filter(Boolean).join(" - ")}_`);
            upLines.push(``);
          }

          // Diferença a pagar da implantação
          upLines.push(`Diferença a Pagar da Implantação:`);
          upLines.push(`*${fmtCurrency(upgImplFinal)}*`);
          upLines.push(``);

          // Forma de pagamento implantação
          if (pedido.pagamento_implantacao_forma || pedido.pagamento_implantacao_observacao) {
            const formaImpl = pedido.pagamento_implantacao_forma || "";
            const obsImpl = pedido.pagamento_implantacao_observacao || "";
            const parcImpl = pedido.pagamento_implantacao_parcelas ? `${pedido.pagamento_implantacao_parcelas}x` : "";
            upLines.push(`_${[formaImpl, parcImpl, obsImpl].filter(Boolean).join(" - ")}_`);
            upLines.push(``);
          }

          // Motivo do desconto
          if (pedido.motivo_desconto) {
            upLines.push(`*Motivo de desconto:*`);
            upLines.push(pedido.motivo_desconto);
            upLines.push(``);
          }

          // Observações
          if (pedido.observacoes) {
            upLines.push(`*Obs:*`);
            upLines.push(pedido.observacoes);
          }

          espelhoUpgrade = upLines.join("\n");
        }

        // Build discount detail strings
        const fmtCurrencyVar = (v: any) => {
          const num = Number(v) || 0;
          return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        };

        let descontoDetalhes = "";
        if (pedido) {
          const detLines: string[] = [];
          const implOrig = Number(pedido.valor_implantacao_original) || Number(pedido.valor_implantacao) || 0;
          const implFinal = Number(pedido.valor_implantacao_final) || implOrig;
          const mensOrig = Number(pedido.valor_mensalidade_original) || Number(pedido.valor_mensalidade) || 0;
          const mensFinal = Number(pedido.valor_mensalidade_final) || mensOrig;

          if (implOrig !== implFinal) {
            const descImpl = implOrig - implFinal;
            detLines.push(`Implantação: ${fmtCurrencyVar(descImpl)} de desconto → ${fmtCurrencyVar(implFinal)}`);
          }
          if (mensOrig !== mensFinal) {
            const descMens = mensOrig - mensFinal;
            detLines.push(`Mensalidade: ${fmtCurrencyVar(descMens)} de desconto → ${fmtCurrencyVar(mensFinal)}`);
          }
          descontoDetalhes = detLines.length > 0 ? detLines.join("\n") : "Sem desconto";
        }

        // ─── Calculate margem bruta and markup (mensalidade only, including modules) ───
        let margemBrutaStr = "N/A";
        let markupStr = "N/A";
        let lucroBrutoStr = "N/A";
        if (pedido) {
          let mensFinalCalc = Number(pedido.valor_mensalidade_final) || Number(pedido.valor_mensalidade) || 0;
          if (mensFinalCalc > 0 || pedido.tipo_pedido === "Upgrade") {
            // Load ALL custos (plan + modules)
            const { data: allCustos } = await supabase
              .from("custos")
              .select("plano_id, modulo_id, preco_fornecedor, taxa_boleto, imposto_valor, imposto_tipo, imposto_base, despesas_adicionais");

            const custoPorPlano: Record<string, any> = {};
            const custoPorModulo: Record<string, any> = {};
            (allCustos || []).forEach((c: any) => {
              if (c.plano_id) custoPorPlano[c.plano_id] = c;
              if (c.modulo_id) custoPorModulo[c.modulo_id] = c;
            });

            let custoTotalSemImposto = 0;
            let impostoTotal = 0;

            // Helper: calcular custo de um plano
            const calcPlanoCusto = (cp: any, receitaRef: number) => {
              if (!cp) return { custo: 0, imposto: 0 };
              const c = (Number(cp.preco_fornecedor) || 0) + (Number(cp.taxa_boleto) || 0) + (Number(cp.despesas_adicionais) || 0);
              let imp = 0;
              if (cp.imposto_tipo === "%" && cp.imposto_base === "venda") {
                imp = receitaRef * ((Number(cp.imposto_valor) || 0) / 100);
              } else if (cp.imposto_tipo === "%" && cp.imposto_base === "compra") {
                imp = (Number(cp.preco_fornecedor) || 0) * ((Number(cp.imposto_valor) || 0) / 100);
              } else {
                imp = Number(cp.imposto_valor) || 0;
              }
              return { custo: c, imposto: imp };
            };

            const isUpgrade = pedido.tipo_pedido === "Upgrade";

            if (isUpgrade && pedido.contrato_id && pedido.plano_id) {
              // UPGRADE: Rentabilidade COMPLETA da nova configuração
              const { data: planoData } = await supabase
                .from("planos").select("valor_mensalidade_padrao").eq("id", pedido.plano_id).maybeSingle();
              const novoPlanoPreco = Number(planoData?.valor_mensalidade_padrao) || 0;

              // Aplicar desconto sobre preço cheio
              let novoPlanoFinal = novoPlanoPreco;
              const descMensVal = Number(pedido.desconto_mensalidade_valor) || 0;
              if (descMensVal > 0) {
                if (pedido.desconto_mensalidade_tipo === '%') {
                  novoPlanoFinal = novoPlanoPreco * (1 - descMensVal / 100);
                } else {
                  novoPlanoFinal = Math.max(0, novoPlanoPreco - descMensVal);
                }
              }

              // Módulos ativos da hierarquia do contrato
              const { data: contratosHierarquia } = await supabase
                .from("contratos").select("pedido_id")
                .eq("contrato_origem_id", pedido.contrato_id).eq("status", "Ativo").in("tipo", ["Aditivo"]);

              let totalModulosMens = 0;
              const modulosAtivos: any[] = [];
              if (contratosHierarquia && contratosHierarquia.length > 0) {
                const pedidoIds = contratosHierarquia.map((c: any) => c.pedido_id).filter(Boolean);
                if (pedidoIds.length > 0) {
                  const { data: pedidosAditivos } = await supabase
                    .from("pedidos").select("modulos_adicionais").in("id", pedidoIds);
                  (pedidosAditivos || []).forEach((p: any) => {
                    const mods = typeof p.modulos_adicionais === "string" ? JSON.parse(p.modulos_adicionais) : (p.modulos_adicionais || []);
                    if (Array.isArray(mods)) mods.forEach((m: any) => {
                      totalModulosMens += (Number(m.valor_mensalidade_modulo) || 0) * (m.quantidade || 1);
                      modulosAtivos.push(m);
                    });
                  });
                }
              }

              mensFinalCalc = novoPlanoFinal + totalModulosMens;

              // Custo COMPLETO do novo plano
              const custoPlano = custoPorPlano[pedido.plano_id] || null;
              const planoNovo = calcPlanoCusto(custoPlano, mensFinalCalc);
              custoTotalSemImposto += planoNovo.custo;
              impostoTotal += planoNovo.imposto;

              // Custo de TODOS os módulos ativos
              for (const mod of modulosAtivos) {
                const custoMod = mod.modulo_id ? custoPorModulo[mod.modulo_id] : null;
                if (custoMod) {
                  const qty = mod.quantidade || 1;
                  custoTotalSemImposto += ((Number(custoMod.preco_fornecedor) || 0) + (Number(custoMod.taxa_boleto) || 0) + (Number(custoMod.despesas_adicionais) || 0)) * qty;
                  if (custoMod.imposto_tipo === "%") {
                    const impostoBase = custoMod.imposto_base === "venda"
                      ? (Number(mod.valor_mensalidade_modulo) || 0) * qty
                      : (Number(custoMod.preco_fornecedor) || 0) * qty;
                    impostoTotal += impostoBase * ((Number(custoMod.imposto_valor) || 0) / 100);
                  } else {
                    impostoTotal += (Number(custoMod.imposto_valor) || 0) * qty;
                  }
                }
              }
            } else {
              // NÃO-UPGRADE: lógica original
              const custoPlano = pedido.plano_id ? custoPorPlano[pedido.plano_id] : null;
              const planoNovo = calcPlanoCusto(custoPlano, mensFinalCalc);
              custoTotalSemImposto += planoNovo.custo;
              impostoTotal += planoNovo.imposto;

              // Custo dos módulos adicionais do pedido
              const mods = pedido.modulos_adicionais
                ? (typeof pedido.modulos_adicionais === "string" ? JSON.parse(pedido.modulos_adicionais) : pedido.modulos_adicionais)
                : [];
              if (Array.isArray(mods)) {
                for (const mod of mods) {
                  const custoMod = mod.modulo_id ? custoPorModulo[mod.modulo_id] : null;
                  if (custoMod) {
                    const qty = mod.quantidade || 1;
                    custoTotalSemImposto += ((Number(custoMod.preco_fornecedor) || 0) + (Number(custoMod.taxa_boleto) || 0) + (Number(custoMod.despesas_adicionais) || 0)) * qty;
                    if (custoMod.imposto_tipo === "%") {
                      const impostoBase = custoMod.imposto_base === "venda"
                        ? (Number(mod.valor_mensalidade_modulo) || 0) * qty
                        : (Number(custoMod.preco_fornecedor) || 0) * qty;
                      impostoTotal += impostoBase * ((Number(custoMod.imposto_valor) || 0) / 100);
                    } else {
                      impostoTotal += (Number(custoMod.imposto_valor) || 0) * qty;
                    }
                  }
                }
              }
            }

            if (mensFinalCalc > 0) {
              const custoFinal = Math.max(0, custoTotalSemImposto + impostoTotal);
              const lucroBruto = mensFinalCalc - custoFinal;
              const margemBruta = (lucroBruto / mensFinalCalc) * 100;
              const markupCalc = custoFinal > 0 ? ((mensFinalCalc / custoFinal) - 1) * 100 : 0;
              margemBrutaStr = margemBruta.toFixed(1) + "%";
              markupStr = markupCalc.toFixed(1) + "%";
              lucroBrutoStr = fmtCurrencyVar(lucroBruto);
            }
          }
        }

        const pedidoData = pedido?.created_at
          ? new Date(pedido.created_at).toLocaleDateString("pt-BR")
          : "N/A";

        const valorTotal = pedido
          ? fmtCurrencyVar((Number(pedido.valor_implantacao_final) || Number(pedido.valor_implantacao) || 0) + (Number(pedido.valor_mensalidade_final) || Number(pedido.valor_mensalidade) || 0))
          : "N/A";

        const replaceVars = (text: string, userName?: string) => {
          return text
            .replace(/\{usuario\.nome\}/g, userName || "Usuário")
            .replace(/\{cliente\.nome_fantasia\}/g, clienteNome)
            .replace(/\{pedido\.numero\}/g, pedido?.numero_exibicao || "N/A")
            .replace(/\{vendedor\.nome\}/g, vendedorNome)
            .replace(/\{plano\.nome\}/g, planoNome)
            .replace(/\{contrato\.numero\}/g, contratoNumero)
            .replace(/\{filial\.nome\}/g, filialNome)
            .replace(/\{pedido\.tipo\}/g, pedido?.tipo_pedido || "N/A")
            .replace(/\{pedido\.data\}/g, pedidoData)
            .replace(/\{pedido\.valor_implantacao\}/g, fmtCurrencyVar(pedido?.valor_implantacao_final || pedido?.valor_implantacao))
            .replace(/\{pedido\.valor_mensalidade\}/g, fmtCurrencyVar(pedido?.valor_mensalidade_final || pedido?.valor_mensalidade))
            .replace(/\{pedido\.valor_total\}/g, valorTotal)
            .replace(/\{desconto\.detalhes\}/g, descontoDetalhes)
            .replace(/\{espelho\.pedido\}/g, espelhoPedido)
            .replace(/\{espelho\.upgrade\}/g, espelhoUpgrade)
            .replace(/\{desconto\.motivo\}/g, pedido?.motivo_desconto || "Não informado")
            .replace(/\{status\.anterior\}/g, body.status_anterior || "N/A")
            .replace(/\{status\.novo\}/g, body.status_novo || "N/A")
            .replace(/\{margem\.bruta\}/g, margemBrutaStr)
            .replace(/\{margem\.markup\}/g, markupStr)
            .replace(/\{margem\.lucro\}/g, lucroBrutoStr)
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

    // ─── Process: Lembretes 24h para vendedores (contratos aguardando assinatura) ───
    try {
      const now24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: lembretesPendentes } = await supabase
        .from("contratos_vendedor_lembretes")
        .select("*")
        .eq("lembrete_24h_enviado", false)
        .lt("enviado_em", now24h);

      if (lembretesPendentes && lembretesPendentes.length > 0) {
        // Verificar quais contratos ainda estão pendentes de assinatura
        const contratoIds = lembretesPendentes.map((l: any) => l.contrato_id);
        const { data: zapsignRecords } = await supabase
          .from("contratos_zapsign")
          .select("contrato_id, status")
          .in("contrato_id", contratoIds);

        const zStatusMap: Record<string, string> = {};
        (zapsignRecords || []).forEach((z: any) => { zStatusMap[z.contrato_id] = z.status; });

        // WhatsApp config
        const whatsappCfg = whatsappEnabled ? whatsappConfig : null;

        for (const lembrete of lembretesPendentes) {
          const zStatus = zStatusMap[lembrete.contrato_id];
          // Se já assinou, marcar lembrete como enviado (cancelar)
          if (zStatus === "Assinado" || zStatus === "signed") {
            await supabase.from("contratos_vendedor_lembretes")
              .update({ lembrete_24h_enviado: true, lembrete_24h_em: new Date().toISOString() })
              .eq("id", lembrete.id);
            console.log(`[LEMBRETE] Contrato ${lembrete.contrato_numero} já assinado, lembrete cancelado.`);
            continue;
          }

          // Buscar telefone do vendedor
          const { data: vendedorProfile } = await supabase
            .from("profiles")
            .select("full_name, telefone")
            .eq("user_id", lembrete.vendedor_user_id)
            .maybeSingle();

          if (!vendedorProfile?.telefone) {
            console.warn(`[LEMBRETE] Vendedor sem telefone para contrato ${lembrete.contrato_numero}`);
            await supabase.from("contratos_vendedor_lembretes")
              .update({ lembrete_24h_enviado: true, lembrete_24h_em: new Date().toISOString() })
              .eq("id", lembrete.id);
            continue;
          }

          const msgLembrete = `Oi, ${vendedorProfile.full_name}, tudo bem?\n\nPassando para acompanhar o contrato nº ${lembrete.contrato_numero} da ${lembrete.cliente_nome}. Notei que o @${lembrete.decisor_nome} ainda não conseguiu assinar.\n\nSurgiu alguma dúvida ou houve algum problema técnico com o link? Se precisar de qualquer ajuda para explicar algum ponto ou agilizar o processo por aqui, é só me dar um alô.\n\nSegue o link novamente para facilitar:\n🔗 ${lembrete.sign_url || "Link indisponível"}\n\nVamos tentar fechar isso hoje para não perdermos o cronograma?`;

          if (whatsappCfg) {
            let formattedNumber = vendedorProfile.telefone.replace(/\D/g, "");
            if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
            if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

            let baseUrl = whatsappCfg.server_url!.replace(/\/+$/, "");
            try {
              const parsed = new URL(baseUrl);
              if (parsed.protocol === "https:" && parsed.port && parsed.port !== "443") {
                baseUrl = baseUrl.replace(/^https:/, "http:");
              }
            } catch { /* keep */ }

            try {
              await fetch(`${baseUrl}/message/sendText/Softflow_WhatsApp`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: whatsappCfg.token! },
                body: JSON.stringify({ number: formattedNumber, text: msgLembrete }),
              });
              console.log(`[LEMBRETE] WhatsApp 24h enviado para ${vendedorProfile.full_name} (contrato ${lembrete.contrato_numero})`);
            } catch (err) {
              console.error(`[LEMBRETE] Erro WhatsApp 24h:`, err);
            }
          }

          await supabase.from("contratos_vendedor_lembretes")
            .update({ lembrete_24h_enviado: true, lembrete_24h_em: new Date().toISOString() })
            .eq("id", lembrete.id);
          totalProcessed++;
        }
      }
    } catch (err) {
      console.error("[LEMBRETE] Erro ao processar lembretes 24h:", err);
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

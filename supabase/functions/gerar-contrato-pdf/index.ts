import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { contrato_id, action, pdf_base64, tipo_documento } = body;
    const BROWSERLESS_API_KEY = Deno.env.get("BROWSERLESS_API_KEY");

    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: upload ── Client sends generated PDF base64 for storage
    if (action === "upload" && pdf_base64) {
      const pdfBytes = Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0));
      const outputPath = `${contrato_id}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("contratos-pdf")
        .upload(outputPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Erro ao salvar PDF: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedData } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(outputPath, 3600);

      await supabase
        .from("contratos")
        .update({ pdf_url: outputPath, status_geracao: "Gerado" })
        .eq("id", contrato_id);

      return new Response(
        JSON.stringify({
          success: true,
          signed_url: signedData?.signedUrl || null,
          storage_path: outputPath,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: render (default) ── Return rendered HTML with variables substituted
    // 1. Buscar contrato com joins
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        *,
        clientes(
          id, nome_fantasia, razao_social, cnpj_cpf, inscricao_estadual,
          cidade, uf, cep, logradouro, numero, complemento, bairro,
          telefone, email, filial_id
        ),
        planos(id, nome, descricao, valor_mensalidade_padrao, valor_implantacao_padrao),
        pedidos(
          id, filial_id,
          valor_implantacao_final, valor_mensalidade_final, valor_total,
          valor_implantacao_original, valor_mensalidade_original,
          desconto_implantacao_tipo, desconto_implantacao_valor,
          desconto_mensalidade_tipo, desconto_mensalidade_valor,
          observacoes, motivo_desconto, pagamento_mensalidade_observacao, pagamento_mensalidade_forma,
          pagamento_mensalidade_parcelas, pagamento_implantacao_forma,
          pagamento_implantacao_parcelas, pagamento_implantacao_observacao,
          modulos_adicionais, tipo_pedido, servicos_pedido, tipo_atendimento
        )
      `)
      .eq("id", contrato_id)
      .single();

    if (contratoError || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado: " + contratoError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cliente = (contrato as any).clientes;
    const plano = (contrato as any).planos;
    const pedido = (contrato as any).pedidos;

    // 2. Buscar contatos do cliente (decisor)
    const { data: contatos } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, email, decisor, ativo")
      .eq("cliente_id", contrato.cliente_id)
      .eq("ativo", true);

    const decisor = (contatos || []).find((c: any) => c.decisor) || (contatos || [])[0];

    // 2b. Buscar contrato de origem (para aditivos e OAs) + plano anterior para upgrades
    let numeroContratoOrigem = "";
    let planoAnterior: any = null;
    let modulosAdicionaisExistentes: any[] = [];
    if (contrato.contrato_origem_id) {
      const { data: contratoOrigem } = await supabase
        .from("contratos")
        .select("numero_exibicao, plano_id, pedido_id, planos(id, nome, descricao, valor_mensalidade_padrao, valor_implantacao_padrao)")
        .eq("id", contrato.contrato_origem_id)
        .maybeSingle();
      numeroContratoOrigem = contratoOrigem?.numero_exibicao || "";
      if (contratoOrigem && pedido?.tipo_pedido === "Upgrade") {
        planoAnterior = (contratoOrigem as any).planos;

        // Buscar módulos adicionais que o cliente já tinha (do contrato base e aditivos anteriores)
        const { data: pedidosAnteriores } = await supabase
          .from("pedidos")
          .select("modulos_adicionais, tipo_pedido")
          .eq("cliente_id", contrato.cliente_id)
          .in("tipo_pedido", ["Novo", "Módulo Adicional"])
          .neq("id", pedido?.id || "");
        
        if (pedidosAnteriores) {
          for (const p of pedidosAnteriores) {
            const mods = (p.modulos_adicionais || []) as any[];
            modulosAdicionaisExistentes.push(...mods);
          }
        }
      }
    }

    // 3. Buscar filial
    const filialId = pedido?.filial_id || cliente?.filial_id;
    let filial: any = null;
    if (filialId) {
      const { data } = await supabase.from("filiais").select("*").eq("id", filialId).maybeSingle();
      filial = data;
    }

    // 4. Buscar módulos do plano
    let planoModulos: any[] = [];
    if (plano?.id) {
      const { data } = await supabase
        .from("plano_modulos")
        .select("*, modulos(nome)")
        .eq("plano_id", plano.id)
        .eq("incluso_no_plano", true)
        .order("ordem");
      planoModulos = data || [];
    }

    // 5. Buscar template HTML ativo (filial > global)
    // Determinar tipo de template baseado no tipo do contrato
    let tipoTemplate = "CONTRATO_BASE";
    if (tipo_documento === "OA" || contrato.tipo === "OA") {
      tipoTemplate = "ORDEM_ATENDIMENTO";
    } else if (contrato.tipo === "Aditivo") {
      // Diferencia pelo tipo_pedido do pedido vinculado
      const tipoPedido = pedido?.tipo_pedido || "";
      if (tipoPedido === "Upgrade") {
        tipoTemplate = "ADITIVO_UPGRADE";
      } else {
        tipoTemplate = "ADITIVO_MODULO";
      }
    } else if (contrato.tipo === "Cancelamento") {
      tipoTemplate = "CANCELAMENTO";
    }
    
    let template: any = null;
    if (filialId) {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("filial_id", filialId)
        .eq("ativo", true)
        .eq("tipo", tipoTemplate)
        .maybeSingle();
      template = data;
    }
    if (!template) {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .is("filial_id", null)
        .eq("ativo", true)
        .eq("tipo", tipoTemplate)
        .maybeSingle();
      template = data;
    }

    if (!template) {
      const tipoLabel = tipoTemplate === "ORDEM_ATENDIMENTO" ? "Ordem de Atendimento" : "Contrato";
      return new Response(
        JSON.stringify({ error: `Nenhum modelo de ${tipoLabel} ativo encontrado para esta filial.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5b. Se usa cláusulas, buscar template_clauses e montar HTML
    let templateHtml = template.conteudo_html || "";
    if (template.usa_clausulas) {
      const { data: templateClauses } = await supabase
        .from("template_clauses")
        .select("*")
        .eq("template_id", template.id)
        .eq("ativo", true)
        .order("ordem");

      if (templateClauses && templateClauses.length > 0) {
        templateHtml = templateClauses
          .map((c: any, i: number) => {
            const titulo = `<p style="margin-top:20px;margin-bottom:8px;"><strong>CLÁUSULA ${i + 1}ª - ${(c.titulo || "").toUpperCase()}</strong></p>`;
            return titulo + "\n" + (c.conteudo_html || "");
          })
          .join("\n\n");
      }
    }

    if (!templateHtml) {
      return new Response(
        JSON.stringify({ error: "Modelo de contrato sem conteúdo." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Montar dados de variáveis
    const fmtBRL = (v: number) =>
      (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const modulos = (pedido?.modulos_adicionais || []) as any[];

    // Módulos inclusos: extrair da descrição do plano (separado por vírgula)
    const planoDescricao = plano?.descricao || "";
    const modulosInclusosLista = planoDescricao
      ? "<ul style=\"margin:4px 0;padding-left:18px;\">" + planoDescricao.split(",").map((item: string) => item.trim()).filter((item: string) => item.length > 0).map((item: string) => `<li>${item}</li>`).join("") + "</ul>"
      : "<p>—</p>";

    const modulosAdicionaisLista = modulos.length > 0
      ? "<ul>" + modulos.map((m: any) => `<li>${m.nome} (${m.quantidade}x)</li>`).join("") + "</ul>"
      : "";

    const modulosTabelaDetalhada = modulos.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin:10px 0;">
          <thead><tr style="background:#f0f0f0;">
            <th style="border:1px solid #ccc;padding:6px;text-align:left;">Módulo</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">Qtd</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Implantação</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Valor Unit.</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Mensalidade</th>
          </tr></thead>
          <tbody>${modulos.map((m: any) => `<tr>
            <td style="border:1px solid #ccc;padding:6px;">${m.nome}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${m.quantidade}x</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_mensalidade_modulo)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</td>
          </tr>`).join("")}</tbody>
        </table>`
      : "";

    const implOriginal = pedido?.valor_implantacao_original ?? 0;
    const implFinal = pedido?.valor_implantacao_final ?? 0;
    const implDesconto = implOriginal - implFinal;
    const mensOriginal = pedido?.valor_mensalidade_original ?? 0;
    const mensFinal = pedido?.valor_mensalidade_final ?? 0;
    const mensDesconto = mensOriginal - mensFinal;
    const totalGeral = pedido?.valor_total ?? 0;

    // Buscar motivo do desconto: primeiro do campo motivo_desconto, depois de solicitações aprovadas
    let motivoDesconto = pedido?.motivo_desconto || "";
    if (!motivoDesconto && pedido?.id && (implDesconto > 0 || mensDesconto > 0)) {
      const { data: solicitacao } = await supabase
        .from("solicitacoes_desconto")
        .select("observacoes")
        .eq("pedido_id", pedido.id)
        .eq("status", "Aprovado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      motivoDesconto = solicitacao?.observacoes || "";
    }

    // Gerar HTML condicional de desconto
    const temDescontoImpl = implDesconto > 0;
    const temDescontoMens = mensDesconto > 0;
    const temDesconto = temDescontoImpl || temDescontoMens;

    const descontoStyle = 'style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:10px;margin-top:10px;"';

    const descontoImplHtml = temDescontoImpl
      ? `<div ${descontoStyle}>
          <strong style="color:#856404;">⚡ Desconto nos Serviços:</strong><br>
          <span style="text-decoration:line-through;color:#999;">${fmtBRL(implOriginal)}</span> → <strong style="color:#28a745;">${fmtBRL(implFinal)}</strong>
          <span style="color:#856404;font-size:10px;"> (economia de ${fmtBRL(implDesconto)})</span>
        </div>`
      : "";

    const descontoMensHtml = temDescontoMens
      ? `<div ${descontoStyle}>
          <strong style="color:#856404;">⚡ Desconto Mensalidade:</strong><br>
          <span style="text-decoration:line-through;color:#999;">${fmtBRL(mensOriginal)}</span> → <strong style="color:#28a745;">${fmtBRL(mensFinal)}</strong>
          <span style="color:#856404;font-size:10px;"> (economia de ${fmtBRL(mensDesconto)})</span>
        </div>`
      : "";

    const motivoDescontoHtml = temDesconto && motivoDesconto
      ? `<div style="background:#e8f5e9;border:1px solid #81c784;border-radius:4px;padding:8px;margin-top:8px;font-size:10.5px;">
          <strong style="color:#2e7d32;">📋 Motivo do desconto:</strong> ${motivoDesconto}
        </div>`
      : "";

    const enderecoCliente = [
      cliente?.logradouro,
      cliente?.numero ? `, ${cliente.numero}` : "",
      cliente?.complemento ? ` - ${cliente.complemento}` : "",
      cliente?.bairro ? ` - ${cliente.bairro}` : "",
      cliente?.cidade && cliente?.uf ? ` - ${cliente.cidade}/${cliente.uf}` : "",
      cliente?.cep ? ` - CEP ${cliente.cep}` : "",
    ].join("");

    const enderecoFilial = filial ? [
      filial.logradouro,
      filial.numero ? `, ${filial.numero}` : "",
      filial.complemento ? ` - ${filial.complemento}` : "",
      filial.bairro ? ` - ${filial.bairro}` : "",
      filial.cidade && filial.uf ? ` - ${filial.cidade}/${filial.uf}` : "",
      filial.cep ? ` - CEP ${filial.cep}` : "",
    ].join("") : "";

    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const agora = new Date();
    const dataAtual = `${String(agora.getDate()).padStart(2,"0")}/${String(agora.getMonth()+1).padStart(2,"0")}/${agora.getFullYear()}`;
    const dataExtenso = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;

    const logoUrl = template.logo_url || filial?.logo_url || "";

    const formaImplantacao = pedido?.pagamento_implantacao_forma || "";
    const parcelasImplantacao = pedido?.pagamento_implantacao_parcelas;
    const formaMensalidade = pedido?.pagamento_mensalidade_forma || "";
    const parcelasMensalidade = pedido?.pagamento_mensalidade_parcelas;

    const dados: Record<string, string> = {
      "cliente.razao_social": cliente?.razao_social || cliente?.nome_fantasia || "",
      "cliente.nome_fantasia": cliente?.nome_fantasia || "",
      "cliente.cnpj": cliente?.cnpj_cpf || "",
      "cliente.inscricao_estadual": cliente?.inscricao_estadual || "",
      "cliente.endereco_completo": enderecoCliente,
      "cliente.logradouro": cliente?.logradouro || "",
      "cliente.numero": cliente?.numero || "",
      "cliente.complemento": cliente?.complemento || "",
      "cliente.bairro": cliente?.bairro || "",
      "cliente.cidade": cliente?.cidade || "",
      "cliente.uf": cliente?.uf || "",
      "cliente.cep": cliente?.cep || "",
      "cliente.telefone": cliente?.telefone || "",
      "cliente.email": cliente?.email || "",
      "contato.nome_decisor": decisor?.nome || "",
      "contato.telefone_decisor": decisor?.telefone || "",
      "contato.email_decisor": decisor?.email || "",
      "contrato.numero": contrato.numero_exibicao || "",
      "contrato.numero_origem": numeroContratoOrigem,
      "contrato.status": contrato.status || "",
      "contrato.data_geracao": (() => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} às ${hh}:${min}`;
      })(),
      "plano.nome": plano?.nome || "",
      "plano.valor_mensalidade": fmtBRL(plano?.valor_mensalidade_padrao ?? 0),
      "modulos.titulo_inclusos": "MÓDULOS",
      "modulos.inclusos_lista": modulosInclusosLista,
      "modulos.adicionais_lista": modulosAdicionaisLista,
      "modulos.adicionais_existentes_html": "",
      "modulos.tabela_detalhada": modulosTabelaDetalhada,
      "modulos.quantidade_total": modulos.reduce((s: number, m: any) => s + (m.quantidade || 1), 0).toString(),
      "valores.total_adicionais_novos": fmtBRL(modulos.reduce((s: number, m: any) => s + (m.valor_mensalidade_modulo || 0) * (m.quantidade || 1), 0)),
      "valores.implantacao.original": fmtBRL(implOriginal),
      "valores.implantacao.desconto": fmtBRL(implDesconto),
      "valores.implantacao.final": fmtBRL(implFinal),
      "valores.mensalidade.original": fmtBRL(mensOriginal),
      "valores.mensalidade.desconto": fmtBRL(mensDesconto),
      "valores.mensalidade.final": fmtBRL(mensFinal),
      "valores.total_geral": fmtBRL(totalGeral),
      "valores.total_extenso": valorPorExtenso(totalGeral),
      "valores.desconto_implantacao_html": descontoImplHtml,
      "valores.desconto_mensalidade_html": descontoMensHtml,
      "valores.motivo_desconto_html": motivoDescontoHtml,
      "pagamento.implantacao.forma": formaImplantacao,
      "pagamento.implantacao.parcelas": parcelasImplantacao ? `${parcelasImplantacao}x` : "",
      "pagamento.mensalidade.forma": formaMensalidade,
      "pagamento.mensalidade.parcelas": parcelasMensalidade ? `${parcelasMensalidade}x` : "",
      "pagamento.observacoes": pedido?.pagamento_mensalidade_observacao || pedido?.pagamento_implantacao_observacao || "",
      "pedido.observacoes_geral": pedido?.observacoes || "",
      "data.atual": dataAtual,
      "data.atual_extenso": dataExtenso,
      "logo.url": logoUrl,
      "empresa.logo": logoUrl,
      "filial.nome": filial?.nome || "",
      "filial.razao_social": filial?.razao_social || "",
      "filial.responsavel": filial?.responsavel || "",
      "filial.cnpj": filial?.cnpj || "",
      "filial.inscricao_estadual": filial?.inscricao_estadual || "",
      "filial.logradouro": filial?.logradouro || "",
      "filial.numero": filial?.numero || "",
      "filial.complemento": filial?.complemento || "",
      "filial.bairro": filial?.bairro || "",
      "filial.cidade": filial?.cidade || "",
      "filial.uf": filial?.uf || "",
      "filial.cep": filial?.cep || "",
      "filial.endereco_completo": enderecoFilial,
      "filial.telefone": filial?.telefone || "",
      "filial.email": filial?.email || "",
    };

    // ── Variáveis de Upgrade de Plano ──
    if (pedido?.tipo_pedido === "Upgrade" && planoAnterior) {
      dados["plano.nome_anterior"] = planoAnterior.nome || "";
      dados["plano.valor_mensalidade_anterior"] = fmtBRL(planoAnterior.valor_mensalidade_padrao ?? 0);
      dados["plano.valor_implantacao_anterior"] = fmtBRL(planoAnterior.valor_implantacao_padrao ?? 0);
      dados["plano.novo.nome"] = plano?.nome || "";
      dados["plano.novo_nome"] = plano?.nome || "";
      dados["plano.novo.valor_mensalidade"] = fmtBRL(plano?.valor_mensalidade_padrao ?? 0);
      dados["plano.novo_valor_mensalidade"] = fmtBRL(plano?.valor_mensalidade_padrao ?? 0);
      dados["plano.novo.valor_implantacao"] = fmtBRL(plano?.valor_implantacao_padrao ?? 0);
      dados["plano.novo_valor_implantacao"] = fmtBRL(plano?.valor_implantacao_padrao ?? 0);
      // Sobrescrever plano.nome para mostrar o plano ANTERIOR no template
      dados["plano.nome"] = planoAnterior.nome || "";
      dados["plano.valor_mensalidade"] = fmtBRL(planoAnterior.valor_mensalidade_padrao ?? 0);
      dados["valores.plano_anterior"] = fmtBRL(planoAnterior.valor_mensalidade_padrao ?? 0);

      // Sobrescrever título de módulos inclusos para upgrade
      dados["modulos.titulo_inclusos"] = "MÓDULOS DO SEU NOVO PLANO";

      // Módulos inclusos do NOVO plano (usar descrição do plano novo)
      const novoPlanoDesc = plano?.descricao || "";
      if (novoPlanoDesc) {
        dados["modulos.inclusos_lista"] = "<ul style=\"margin:4px 0;padding-left:18px;\">" + 
          novoPlanoDesc.split(",").map((item: string) => item.trim()).filter((item: string) => item.length > 0).map((item: string) => `<li>${item}</li>`).join("") + "</ul>";
      }

      // Módulos adicionais que o cliente já possui (de pedidos anteriores)
      const totalAdicionaisMens = modulosAdicionaisExistentes.reduce((acc: number, m: any) => 
        acc + ((m.valor_mensalidade_modulo || 0) * (m.quantidade || 1)), 0);

      if (modulosAdicionaisExistentes.length > 0) {
        // Lista com valor unitário e total por adicional
        const adicionaisHtml = "<ul style=\"margin:4px 0;padding-left:18px;\">" + 
          modulosAdicionaisExistentes.map((m: any) => {
            const qty = m.quantidade || 1;
            const unitVal = m.valor_mensalidade_modulo || 0;
            const totalVal = unitVal * qty;
            return `<li>${m.nome} (${qty}x) — Unit.: ${fmtBRL(unitVal)} | Total: ${fmtBRL(totalVal)}</li>`;
          }).join("") + "</ul>";
        dados["modulos.adicionais_lista"] = adicionaisHtml;

        // Bloco HTML completo com título + lista (condicional - só aparece se houver)
        dados["modulos.adicionais_existentes_html"] = `<p style="margin-top:16px;"><strong>Adicionais já existentes:</strong></p>${adicionaisHtml}`;

        const totalAdicionaisImpl = modulosAdicionaisExistentes.reduce((acc: number, m: any) => 
          acc + ((m.valor_implantacao_modulo || 0) * (m.quantidade || 1)), 0);

        // Tabela detalhada dos adicionais existentes
        dados["modulos.tabela_detalhada"] = `<table style="width:100%;border-collapse:collapse;margin:10px 0;">
          <thead><tr style="background:#f0f0f0;">
            <th style="border:1px solid #ccc;padding:6px;text-align:left;">Módulo</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">Qtd</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Unit.</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Mensalidade</th>
          </tr></thead>
          <tbody>${modulosAdicionaisExistentes.map((m: any) => {
            const qty = m.quantidade || 1;
            const unitVal = m.valor_mensalidade_modulo || 0;
            return `<tr>
            <td style="border:1px solid #ccc;padding:6px;">${m.nome}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${qty}x</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(unitVal)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(unitVal * qty)}</td>
          </tr>`;
          }).join("")}</tbody>
        </table>`;

        // Recalcular resumo financeiro para incluir adicionais existentes
        const novoPlanoMens = plano?.valor_mensalidade_padrao ?? 0;
        const mensalidadeTotal = novoPlanoMens + totalAdicionaisMens;
        dados["valores.mensalidade.original"] = fmtBRL(mensalidadeTotal);
        dados["valores.mensalidade.final"] = fmtBRL(mensalidadeTotal);
        dados["valores.total_geral"] = fmtBRL((pedido?.valor_implantacao_final ?? 0) + mensalidadeTotal);
        dados["valores.total_extenso"] = valorPorExtenso((pedido?.valor_implantacao_final ?? 0) + mensalidadeTotal);
        dados["valores.adicionais_mensalidade"] = fmtBRL(totalAdicionaisMens);
      } else {
        // Sem adicionais existentes - variável vazia para não aparecer no documento
        dados["modulos.adicionais_existentes_html"] = "";
      }

      // ── Mensalidade Anterior (plano anterior + adicionais existentes - desconto se houver) ──
      const planoAnteriorMens = planoAnterior.valor_mensalidade_padrao ?? 0;
      const mensAnteriorTotal = planoAnteriorMens + totalAdicionaisMens;
      let mensAnteriorHtml = `<strong>${planoAnterior.nome}:</strong> ${fmtBRL(planoAnteriorMens)}`;
      if (totalAdicionaisMens > 0) {
        mensAnteriorHtml += `<br>Adicionais: ${fmtBRL(totalAdicionaisMens)}`;
      }
      mensAnteriorHtml += `<br><strong>Total anterior: ${fmtBRL(mensAnteriorTotal)}</strong>`;
      dados["valores.mensalidade_anterior_html"] = mensAnteriorHtml;

      // ── Nova Mensalidade (novo plano + adicionais existentes) ──
      const novoPlanoMensVal = plano?.valor_mensalidade_padrao ?? 0;
      const mensNovaTotal = novoPlanoMensVal + totalAdicionaisMens;
      let mensNovaHtml = `<strong>${plano?.nome || ""}:</strong> ${fmtBRL(novoPlanoMensVal)}`;
      if (totalAdicionaisMens > 0) {
        mensNovaHtml += `<br>Adicionais: ${fmtBRL(totalAdicionaisMens)}`;
      }
      // Aplicar desconto de mensalidade se houver
      const descontoMensUpgrade = mensOriginal - mensFinal;
      if (descontoMensUpgrade > 0) {
        mensNovaHtml += `<br>Desconto: -${fmtBRL(descontoMensUpgrade)}`;
        mensNovaHtml += `<br><strong>Total nova mensalidade: ${fmtBRL(mensNovaTotal - descontoMensUpgrade)}</strong>`;
      } else {
        mensNovaHtml += `<br><strong>Total nova mensalidade: ${fmtBRL(mensNovaTotal)}</strong>`;
      }
      dados["valores.nova_mensalidade_html"] = mensNovaHtml;
    }

    // ── Variáveis de Serviços (OA) ──
    const servicosPedido = (pedido?.servicos_pedido || []) as any[];
    if (servicosPedido.length > 0) {
      const servicosListaHtml = servicosPedido.map((s: any) => {
          const qty = s.quantidade || 1;
          const valor = s.valor_unitario || s.valor || 0;
          const subtotal = valor * qty;
          return `<tr>
            <td style="border:1px solid #dee2e6;padding:4px 6px;">${s.nome}</td>
            <td style="border:1px solid #dee2e6;padding:4px 6px;">${s.descricao || "—"}</td>
            <td style="border:1px solid #dee2e6;padding:4px 6px;text-align:center;">${s.unidade_medida || "un."}</td>
            <td style="border:1px solid #dee2e6;padding:4px 6px;text-align:center;">${qty}</td>
            <td style="border:1px solid #dee2e6;padding:4px 6px;text-align:right;">${fmtBRL(valor)}</td>
            <td style="border:1px solid #dee2e6;padding:4px 6px;text-align:right;">${fmtBRL(subtotal)}</td>
          </tr>`;
        }).join("");

      const servicosTabelaHtml = `<table style="width:100%;border-collapse:collapse;margin:10px 0;">
        <thead><tr style="background:#f0f0f0;">
          <th style="border:1px solid #ccc;padding:6px;text-align:left;">Serviço</th>
          <th style="border:1px solid #ccc;padding:6px;text-align:left;">Descrição</th>
          <th style="border:1px solid #ccc;padding:6px;text-align:center;">Unid.</th>
          <th style="border:1px solid #ccc;padding:6px;text-align:center;">Qtd.</th>
          <th style="border:1px solid #ccc;padding:6px;text-align:right;">Valor Unit.</th>
          <th style="border:1px solid #ccc;padding:6px;text-align:right;">Subtotal</th>
        </tr></thead>
        <tbody>${servicosPedido.map((s: any) => {
          const qty = s.quantidade || 1;
          const valor = s.valor_unitario || s.valor || 0;
          const subtotal = valor * qty;
          return `<tr>
            <td style="border:1px solid #ccc;padding:6px;">${s.nome}</td>
            <td style="border:1px solid #ccc;padding:6px;">${s.descricao || ""}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${s.unidade_medida || "un."}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${qty}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(valor)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(subtotal)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;

      const quantidadeTotal = servicosPedido.reduce((s: number, sv: any) => s + (sv.quantidade || 1), 0);
      const valorTotalServicos = servicosPedido.reduce((s: number, sv: any) => s + ((sv.valor_unitario || sv.valor || 0) * (sv.quantidade || 1)), 0);

      dados["servicos.lista_html"] = servicosListaHtml;
      dados["servicos.tabela_html"] = servicosTabelaHtml;
      dados["servicos.valor_total"] = fmtBRL(valorTotalServicos);
      dados["servicos.valor_total_extenso"] = valorPorExtenso(valorTotalServicos);
      dados["servicos.quantidade_total"] = String(quantidadeTotal);
      dados["servicos.tipo_atendimento"] = pedido?.tipo_atendimento || "";
      dados["servicos.comissao_percentual"] = "";
      dados["servicos.comissao_valor"] = "";

      // Variável de desconto OA para WhatsApp
      if (temDesconto) {
        const partes: string[] = [];
        if (temDescontoImpl) {
          partes.push(`⚡ *Desconto:* ~~${fmtBRL(implOriginal)}~~ → *${fmtBRL(implFinal)}* (economia de ${fmtBRL(implDesconto)})`);
        }
        if (motivoDesconto) {
          partes.push(`📋 *Motivo:* ${motivoDesconto}`);
        }
        dados["desconto.oa_html"] = partes.join("\n");
      } else {
        dados["desconto.oa_html"] = "";
      }
    } else {
      dados["servicos.lista_html"] = "";
      dados["servicos.tabela_html"] = "";
      dados["servicos.valor_total"] = fmtBRL(0);
      dados["servicos.valor_total_extenso"] = "";
      dados["servicos.quantidade_total"] = "0";
      dados["servicos.tipo_atendimento"] = pedido?.tipo_atendimento || "";
      dados["servicos.comissao_percentual"] = "";
      dados["servicos.comissao_valor"] = "";
      dados["desconto.oa_html"] = "";
    }

    // 7. Substituir variáveis no HTML
    let htmlFinal = templateHtml;

    // Forçar quebra de página antes do ANEXO I
    htmlFinal = htmlFinal.replace(
      /((?:<[^>]*>)*ANEXO\s+I\s*[-–—]\s*ESPECIFICA)/gi,
      '<div style="page-break-before:always;"></div>$1'
    );

    htmlFinal = htmlFinal.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
      const trimmedKey = key.trim();
      if (trimmedKey === "modulos.tabela_detalhada" && !dados[trimmedKey]) return "";
      const value = dados[trimmedKey];
      if (value === undefined) return match;
      return value;
    });

    // Se action === "generate", gerar PDF via Browserless
    if (action === "generate") {
      if (!BROWSERLESS_API_KEY) {
        return new Response(
          JSON.stringify({ error: "BROWSERLESS_API_KEY não configurada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Envolver HTML em documento completo com estilos A4
      const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
  body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 10.5pt; line-height: 1.35; color: #000; }
  table { border-collapse: collapse; page-break-inside: avoid; }
  img { max-width: 100%; }
  p { margin: 2px 0; }
  h1, h2, h3, h4, h5, h6 { margin: 6px 0 2px 0; }
  ul, ol { margin: 2px 0; padding-left: 18px; page-break-inside: avoid; }
  li { margin: 1px 0; }
  div { margin: 0; }
  hr { margin: 4px 0; }
  /* Manter anexo/seções técnicas juntas na mesma página */
  table + table { page-break-before: avoid; }
  p + table { page-break-between: avoid; }
  strong { page-break-after: avoid; }
</style>
</head><body>${htmlFinal}</body></html>`;

      // Chamar Browserless PDF API
      const browserlessUrl = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_API_KEY}`;
      const pdfResponse = await fetch(browserlessUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: fullHtml,
          options: {
            format: "A4",
            printBackground: true,
            margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
          },
          gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
        }),
      });

      if (!pdfResponse.ok) {
        const errText = await pdfResponse.text();
        console.error("Browserless error:", pdfResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Erro ao gerar PDF: ${pdfResponse.status} - ${errText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfBuffer);
      const outputPath = `${contrato_id}.pdf`;

      // Upload para storage
      const { error: uploadError } = await supabase.storage
        .from("contratos-pdf")
        .upload(outputPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Erro ao salvar PDF: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedData } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(outputPath, 3600);

      await supabase
        .from("contratos")
        .update({ pdf_url: outputPath, status_geracao: "Gerado" })
        .eq("id", contrato_id);

      return new Response(
        JSON.stringify({
          success: true,
          signed_url: signedData?.signedUrl || null,
          storage_path: outputPath,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: retornar HTML renderizado (para preview)
    return new Response(
      JSON.stringify({
        success: true,
        html: htmlFinal,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro geral:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Valor por extenso ───────────────────────────────────────────────────────
function valorPorExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function porExtenso(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const resto = n % 100;
      return centenas[c] + (resto > 0 ? " e " + porExtenso(resto) : "");
    }
    if (n < 1000000) {
      const milhares = Math.floor(n / 1000);
      const resto = n % 1000;
      const milStr = milhares === 1 ? "mil" : porExtenso(milhares) + " mil";
      return milStr + (resto > 0 ? (resto < 100 ? " e " : " ") + porExtenso(resto) : "");
    }
    return String(n);
  }

  let resultado = porExtenso(inteiro) + (inteiro === 1 ? " real" : " reais");
  if (centavos > 0) {
    resultado += " e " + porExtenso(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }
  return resultado;
}
